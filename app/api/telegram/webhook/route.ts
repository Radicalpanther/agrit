import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  sendTelegramMessage,
  answerCallbackQuery,
  editTelegramMessage,
  setMyCommands,
  deleteMyCommands,
  TelegramBotCommand,
} from '@/lib/telegram'
import { updateBookingStatus } from '@/lib/booking-status'
import { buildFarmerBookingMessage } from '@/lib/notify'

export const HOST_COMMANDS: TelegramBotCommand[] = [
  { command: 'bookings', description: 'List next 10 upcoming and pending bookings' },
  { command: 'pending', description: 'List pending requests with Accept and Decline buttons' },
  { command: 'help', description: 'Show available host commands' },
  { command: 'stop', description: 'Disconnect your Telegram account' },
]

export const DEFAULT_COMMANDS: TelegramBotCommand[] = [
  { command: 'bookings', description: 'List next 10 upcoming and pending bookings' },
  { command: 'pending', description: 'List pending requests with Accept and Decline buttons' },
  { command: 'help', description: 'Show available host commands' },
  { command: 'stop', description: 'Disconnect your Telegram account' },
  { command: 'start', description: 'Connect your host account' },
]

// In-memory rate limiting and deduplication
const processedUpdates = new Map<number, number>()
const chatRateLimits = new Map<string | number, number[]>()

function isDuplicateUpdate(updateId?: number): boolean {
  if (!updateId) return false
  const now = Date.now()
  for (const [id, ts] of processedUpdates.entries()) {
    if (now - ts > 10 * 60 * 1000) {
      processedUpdates.delete(id)
    }
  }
  if (processedUpdates.has(updateId)) {
    return true
  }
  processedUpdates.set(updateId, now)
  return false
}

function isRateLimited(chatId: string | number): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000
  const maxPerMinute = 25

  const history = (chatRateLimits.get(chatId) || []).filter((ts) => now - ts < windowMs)
  if (history.length >= maxPerMinute) {
    chatRateLimits.set(chatId, history)
    return true
  }
  history.push(now)
  chatRateLimits.set(chatId, history)
  return false
}

function getTodayKolkata(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getHostHelpMessage(siteUrl: string): string {
  return [
    'Available host commands:',
    '/bookings - List next 10 upcoming and pending bookings',
    '/pending - List pending requests with Accept and Decline buttons',
    '/help - Show this list of commands',
    '/stop - Disconnect your Telegram account',
    '',
    `Dashboard: ${siteUrl}/dashboard`,
  ].join('\n')
}

export async function POST(request: Request) {
  // 1. Secret token header validation
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret) {
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token')
    if (!headerSecret || headerSecret !== expectedSecret) {
      console.warn('[Telegram Webhook] Unauthorized request: secret token missing or mismatch')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await request.json()

    // 2. Idempotency deduplication by update_id
    if (isDuplicateUpdate(body?.update_id)) {
      return NextResponse.json({ ok: true })
    }

    const serviceClient = await createServiceClient()
    const rawSiteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://agrit-jnk4.vercel.app'
    const siteUrl = rawSiteUrl.replace(/\/+$/, '')

    // 3. Handle Callback Query (Accept / Decline inline buttons)
    if (body.callback_query) {
      const cq = body.callback_query
      const callbackQueryId = cq.id
      const chatId = cq.message?.chat?.id || cq.from?.id
      const messageId = cq.message?.message_id
      const originalText = cq.message?.text || ''
      const data: string = cq.data || ''

      if (chatId && isRateLimited(chatId)) {
        await answerCallbackQuery(callbackQueryId, 'Please slow down.')
        return NextResponse.json({ ok: true })
      }

      // Format: bk:accept:{id}, bk:decline:{id}, bk:{id}:a, bk:{id}:d
      let bookingId: string | null = null
      let action: 'confirmed' | 'declined' | null = null

      if (data.startsWith('bk:accept:')) {
        bookingId = data.substring('bk:accept:'.length)
        action = 'confirmed'
      } else if (data.startsWith('bk:decline:')) {
        bookingId = data.substring('bk:decline:'.length)
        action = 'declined'
      } else {
        const parts = data.split(':')
        if (parts[0] === 'bk' && parts.length === 3) {
          if (parts[1] === 'accept') {
            bookingId = parts[2]
            action = 'confirmed'
          } else if (parts[1] === 'decline') {
            bookingId = parts[2]
            action = 'declined'
          } else if (parts[2] === 'a') {
            bookingId = parts[1]
            action = 'confirmed'
          } else if (parts[2] === 'd') {
            bookingId = parts[1]
            action = 'declined'
          }
        }
      }

      if (bookingId && action) {
        // Authorize: verify the tapping user owns the farm
        const { data: booking } = await serviceClient
          .from('bookings')
          .select('id, farm:farms(owner_id)')
          .eq('id', bookingId)
          .maybeSingle()

        const ownerId = (booking?.farm as any)?.owner_id
        let isAuthorized = false

        if (ownerId) {
          const { data: ownerProfile } = await serviceClient
            .from('profiles')
            .select('telegram_chat_id')
            .eq('id', ownerId)
            .maybeSingle()

          if (ownerProfile?.telegram_chat_id && String(ownerProfile.telegram_chat_id) === String(chatId)) {
            isAuthorized = true
          }
        }

        if (!isAuthorized) {
          await answerCallbackQuery(callbackQueryId, 'Not allowed: you do not own this farm.', true)
          return NextResponse.json({ ok: true })
        }

        const result = await updateBookingStatus(bookingId, action, {
          type: 'telegram',
          chatId,
          originalMessageText: originalText,
        })

        if (result.alreadyHandled) {
          const currentStatus = result.currentStatus || 'handled'
          await answerCallbackQuery(callbackQueryId, `Already ${currentStatus}`)
          const statusText =
            currentStatus === 'confirmed'
              ? 'Confirmed by host'
              : currentStatus === 'declined'
              ? 'Declined by host'
              : currentStatus
          const timeNow = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          const cleanBase = originalText.replace(/\n\nStatus:[\s\S]*$/, '')
          const updated = `${cleanBase}\n\nStatus: ${statusText} at ${timeNow}`
          await editTelegramMessage(chatId, messageId, updated, {
            reply_markup: { inline_keyboard: [] },
          })
          return NextResponse.json({ ok: true })
        }

        if (result.success) {
          const alertText = action === 'confirmed' ? 'Booking confirmed' : 'Booking declined'
          await answerCallbackQuery(callbackQueryId, alertText)
        } else {
          await answerCallbackQuery(callbackQueryId, result.error || 'Failed to update', true)
        }
      } else {
        await answerCallbackQuery(callbackQueryId, 'Invalid request', true)
      }

      return NextResponse.json({ ok: true })
    }

    // 4. Handle Text Messages
    if (body.message) {
      const msg = body.message
      const chat = msg.chat

      // Only private chats are supported
      if (chat?.type !== 'private') {
        return NextResponse.json({ ok: true })
      }

      const chatId = chat.id
      if (isRateLimited(chatId)) {
        return NextResponse.json({ ok: true })
      }

      const text: string = (msg.text || '').trim()
      const command = text.split(' ')[0].toLowerCase().replace(/@\w+$/, '')

      // Handle /start with token: "/start <token>"
      if (text.startsWith('/start ') && text.length > 7) {
        const token = text.substring(7).trim()

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { data: tokenRow, error: tokenErr } = await serviceClient
          .from('telegram_link_tokens')
          .select('token, user_id, used, expires_at, created_at')
          .eq('token', token)
          .eq('used', false)
          .maybeSingle()

        const isExpired =
          !tokenRow ||
          (tokenRow.expires_at
            ? new Date(tokenRow.expires_at) < new Date()
            : new Date(tokenRow.created_at) < new Date(tenMinutesAgo))

        if (tokenErr || isExpired) {
          await sendTelegramMessage(
            chatId,
            'This connection link is expired or invalid. Please open your AgriTrails dashboard and click Connect Telegram to generate a new link.',
          )
          return NextResponse.json({ ok: true })
        }

        // Fetch user profile to verify role
        const { data: targetProfile } = await serviceClient
          .from('profiles')
          .select('id, full_name, role, phone, telegram_chat_id')
          .eq('id', tokenRow.user_id)
          .maybeSingle()

        // Restrict Telegram strictly to farmers (hosts)
        if (targetProfile?.role !== 'farmer') {
          await serviceClient
            .from('telegram_link_tokens')
            .update({ used: true })
            .eq('token', token)

          await sendTelegramMessage(
            chatId,
            'This bot is for farm hosts. Connect from your AgriTrails dashboard.',
          )
          return NextResponse.json({ ok: true })
        }

        // Mark token used
        await serviceClient
          .from('telegram_link_tokens')
          .update({ used: true })
          .eq('token', token)

        // Capture username or first name
        const accountName = msg.from?.username
          ? `@${msg.from.username}`
          : msg.from?.first_name || 'Host'

        // Save telegram_chat_id and telegram_account_name on farmer profile
        await serviceClient
          .from('profiles')
          .update({
            telegram_chat_id: chatId,
            telegram_account_name: accountName,
            telegram_linked_at: new Date().toISOString(),
          })
          .eq('id', targetProfile.id)

        // Register host commands for this chat
        await setMyCommands(HOST_COMMANDS, { type: 'chat', chat_id: chatId })

        const farmerName = targetProfile.full_name || 'Host'
        const confirmationMessage = `Your AgriTrails farmer account (${farmerName}) is connected. You will receive real-time booking requests here with instant Accept and Decline buttons.\n\nType /help to see available commands.`

        await sendTelegramMessage(chatId, confirmationMessage)
        return NextResponse.json({ ok: true })
      }

      // Plain /start without token
      if (command === '/start') {
        await sendTelegramMessage(
          chatId,
          'This bot is for farm hosts. Connect from your AgriTrails dashboard.',
        )
        return NextResponse.json({ ok: true })
      }

      // Look up profile by telegram_chat_id
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('id, full_name, role, phone, telegram_chat_id')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      // Handle unlinked users or tourists
      if (!userProfile || userProfile.role !== 'farmer') {
        await sendTelegramMessage(
          chatId,
          'This bot is for farm hosts. Connect from your AgriTrails dashboard.',
        )
        return NextResponse.json({ ok: true })
      }

      // Handle /stop or /disconnect
      if (command === '/stop' || command === '/disconnect') {
        await serviceClient
          .from('profiles')
          .update({
            telegram_chat_id: null,
            telegram_account_name: null,
            telegram_linked_at: null,
          })
          .eq('id', userProfile.id)

        await deleteMyCommands({ type: 'chat', chat_id: chatId })

        await sendTelegramMessage(
          chatId,
          'Your AgriTrails account has been disconnected. You will no longer receive notifications on Telegram.',
        )
        return NextResponse.json({ ok: true })
      }

      // Fetch farms owned by this farmer
      const { data: farms } = await serviceClient
        .from('farms')
        .select('id, name')
        .eq('owner_id', userProfile.id)

      const farmList = farms || []
      const farmIds = farmList.map((f) => f.id)
      const farmCount = farmIds.length

      // Command: /pending
      if (command === '/pending') {
        if (farmCount === 0) {
          await sendTelegramMessage(
            chatId,
            'No pending requests. You have 0 farm stays linked.',
          )
          return NextResponse.json({ ok: true })
        }

        const { data: pendingBookings } = await serviceClient
          .from('bookings')
          .select(`
            id,
            guest_name,
            guest_phone,
            visit_type,
            nights,
            check_in,
            arrival_time,
            guests,
            total_paise,
            discount_pct,
            status,
            farm:farms(name),
            tourist:profiles(full_name, phone)
          `)
          .in('farm_id', farmIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10)

        if (!pendingBookings || pendingBookings.length === 0) {
          await sendTelegramMessage(
            chatId,
            `No pending requests. You have ${farmCount} farm stay${farmCount === 1 ? '' : 's'} linked.`,
          )
          return NextResponse.json({ ok: true })
        }

        for (const b of pendingBookings) {
          const guestName = b.guest_name || (b.tourist as any)?.full_name || 'Guest'
          const guestPhone = b.guest_phone || (b.tourist as any)?.phone || ''

          const { data: reservations } = await serviceClient
            .from('product_reservations')
            .select('qty, product:products(name)')
            .eq('booking_id', b.id)

          const reservedProductsText = reservations?.length
            ? reservations.map((r: any) => `${r.product?.name || 'Produce'} x ${r.qty}`).join(', ')
            : undefined

          const { text: msgText, replyMarkup } = buildFarmerBookingMessage(
            {
              id: b.id,
              guest_name: guestName,
              visit_type: b.visit_type,
              nights: b.nights,
              check_in: b.check_in,
              arrival_time: b.arrival_time,
              guests: b.guests,
              total_paise: b.total_paise,
              discount_pct: b.discount_pct,
              farm: { name: (b.farm as any)?.name },
              tourist: { full_name: guestName, phone: guestPhone },
            },
            reservedProductsText,
          )

          const res = await sendTelegramMessage(chatId, msgText, {
            reply_markup: replyMarkup,
          })

          if (res.messageId) {
            await serviceClient
              .from('bookings')
              .update({
                telegram_message_id: res.messageId,
                telegram_chat_id: chatId,
              })
              .eq('id', b.id)
          }
        }

        return NextResponse.json({ ok: true })
      }

      // Command: /bookings
      if (command === '/bookings' || command === '/booking') {
        if (farmCount === 0) {
          await sendTelegramMessage(
            chatId,
            `No bookings found. You have 0 farm stays linked.\n\nDashboard: ${siteUrl}/dashboard`,
          )
          return NextResponse.json({ ok: true })
        }

        const today = getTodayKolkata()
        // Query next 10 upcoming and pending bookings
        let { data: bookings } = await serviceClient
          .from('bookings')
          .select(`
            id,
            guest_name,
            guest_phone,
            check_in,
            nights,
            visit_type,
            guests,
            total_paise,
            status,
            farm:farms(name),
            tourist:profiles(full_name, phone)
          `)
          .in('farm_id', farmIds)
          .in('status', ['pending', 'confirmed'])
          .gte('check_in', today)
          .order('check_in', { ascending: true })
          .limit(10)

        if (!bookings || bookings.length === 0) {
          // Fallback to recent bookings if none are in the future
          const { data: recent } = await serviceClient
            .from('bookings')
            .select(`
              id,
              guest_name,
              guest_phone,
              check_in,
              nights,
              visit_type,
              guests,
              total_paise,
              status,
              farm:farms(name),
              tourist:profiles(full_name, phone)
            `)
            .in('farm_id', farmIds)
            .in('status', ['pending', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(10)

          bookings = recent
        }

        if (!bookings || bookings.length === 0) {
          await sendTelegramMessage(
            chatId,
            `No bookings found. You have ${farmCount} farm stay${farmCount === 1 ? '' : 's'} linked.\n\nDashboard: ${siteUrl}/dashboard`,
          )
          return NextResponse.json({ ok: true })
        }

        const items = bookings.map((b) => {
          const guestName = b.guest_name || (b.tourist as any)?.full_name || 'Guest'
          const farmName = (b.farm as any)?.name || 'Farm'
          const stayType = b.visit_type === 'day' ? 'Day visit' : `${b.nights || 1} night(s)`
          const statusText = b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'
          return [
            `Ref: ${b.id.slice(0, 8)} | Guest: ${guestName} | Farm: ${farmName}`,
            `Date: ${b.check_in} (${stayType}) | Guests: ${b.guests} | Status: ${statusText}`,
          ].join('\n')
        })

        await sendTelegramMessage(
          chatId,
          `Upcoming and pending bookings (${bookings.length}):\n\n${items.join('\n\n')}\n\nDashboard: ${siteUrl}/dashboard`,
        )
        return NextResponse.json({ ok: true })
      }

      // Command: /help or any other command
      await sendTelegramMessage(chatId, getHostHelpMessage(siteUrl))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err)
    return NextResponse.json({ ok: true })
  }
}
