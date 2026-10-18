import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  sendTelegramMessage,
  answerCallbackQuery,
  editTelegramMessage,
} from '@/lib/telegram'
import { updateBookingStatus } from '@/lib/booking-status'
import { buildFarmerBookingMessage } from '@/lib/notify'

/**
 * Returns YYYY-MM-DD in Asia/Kolkata timezone
 */
function getTodayKolkata(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Returns role-adjusted plain-text help command list
 */
function getHelpMessage(role: string): string {
  if (role === 'farmer') {
    return [
      'Available commands:',
      '/bookings - List your farm bookings (upcoming and recent)',
      '/pending - Send pending booking requests with Accept and Decline buttons',
      '/today - List today\'s confirmed visits with guest phone numbers and reserved produce',
      '/msg <phone> <text> - Send a direct Telegram message to a guest by phone number',
      '/stop - Disconnect your Telegram account',
      '/help - Show this list of commands',
    ].join('\n')
  }

  return [
    'Available commands:',
    '/bookings - List your farm stays (upcoming and recent)',
    '/msg <phone> <text> - Send a message to your host by phone number',
    '/stop - Disconnect your Telegram account',
    '/help - Show this list of commands',
  ].join('\n')
}

export async function POST(request: Request) {
  // 1. Verify Telegram secret token header if configured
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret) {
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token')
    if (headerSecret !== expectedSecret) {
      console.warn('[Telegram Webhook] Unauthorized request: secret token mismatch')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await request.json()
    const serviceClient = await createServiceClient()
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://agrit-jnk4.vercel.app').replace(/\/+$/, '')

    // 2. Handle Callback Query (Accept / Decline inline buttons)
    if (body.callback_query) {
      const cq = body.callback_query
      const callbackQueryId = cq.id
      const chatId = cq.message?.chat?.id || cq.from?.id
      const messageId = cq.message?.message_id
      const originalText = cq.message?.text || ''
      const data: string = cq.data || ''

      // Expected format: bk:{bookingId}:{a|d}
      const parts = data.split(':')
      if (parts[0] === 'bk' && parts.length === 3) {
        const bookingId = parts[1]
        const action = parts[2] === 'a' ? 'confirmed' : 'declined'

        // Fetch booking to verify sender owns the farm
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
          await answerCallbackQuery(callbackQueryId, 'Not allowed', true)
          return NextResponse.json({ ok: true })
        }

        // Call shared updateBookingStatus
        const result = await updateBookingStatus(bookingId, action, {
          type: 'telegram',
          chatId,
          originalMessageText: originalText,
        })

        if (result.alreadyHandled) {
          const currentStatus = result.currentStatus || 'handled'
          await answerCallbackQuery(callbackQueryId, `Already ${currentStatus}`)
          const statusText = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)
          const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          const updated = originalText.includes('Status:')
            ? originalText
            : `${originalText}\n\nStatus: ${statusText} at ${timeNow}`
          await editTelegramMessage(chatId, messageId, updated, {
            reply_markup: { inline_keyboard: [] },
          })
          return NextResponse.json({ ok: true })
        }

        if (result.success) {
          const shortResult = action === 'confirmed' ? 'Booking accepted' : 'Booking declined'
          await answerCallbackQuery(callbackQueryId, shortResult)
        } else {
          await answerCallbackQuery(callbackQueryId, result.error || 'Failed to update', true)
        }
      }

      return NextResponse.json({ ok: true })
    }

    // 3. Handle Text Messages and Contacts
    if (body.message) {
      const msg = body.message
      const chat = msg.chat

      // Only handle private chats
      if (chat?.type !== 'private') {
        return NextResponse.json({ ok: true })
      }

      const chatId = chat.id
      const text: string = (msg.text || '').trim()
      const command = text.split(' ')[0].toLowerCase().replace(/@\w+$/, '')

      // Handle phone number input (via text or shared contact) to link account directly
      const contactPhone = msg.contact?.phone_number
      const trimmedText = text.replace(/\s+/g, '')
      const isPhoneInput = Boolean(contactPhone) || (!text.startsWith('/') && /^\+?[0-9]{7,15}$/.test(trimmedText))

      if (isPhoneInput) {
        const rawDigits = (contactPhone || trimmedText).replace(/\D/g, '')
        const last10 = rawDigits.slice(-10)

        const { data: allProfiles } = await serviceClient
          .from('profiles')
          .select('id, full_name, role, phone, telegram_chat_id')

        const matched = allProfiles?.find((p) => p.phone && p.phone.replace(/\D/g, '').endsWith(last10))

        if (matched) {
          await serviceClient
            .from('profiles')
            .update({
              telegram_chat_id: chatId,
              telegram_linked_at: new Date().toISOString(),
            })
            .eq('id', matched.id)

          const roleName = matched.role === 'farmer' ? 'farm host' : 'tourist'
          const welcome = `Found your account for ${matched.full_name} (${matched.phone}). Connected as ${roleName}.`
          const help = getHelpMessage(matched.role)
          await sendTelegramMessage(chatId, `${welcome}\n\n${help}`)
          return NextResponse.json({ ok: true })
        } else {
          await sendTelegramMessage(
            chatId,
            `No account found in database with phone number ${contactPhone || trimmedText}. Please update your phone number on your AgriTrails profile or connect from the website: ${siteUrl}`,
          )
          return NextResponse.json({ ok: true })
        }
      }

      // Handle /start with token: "/start {token}"
      if (text.startsWith('/start ') && text.length > 7) {
        const token = text.substring(7).trim()

        // Lookup unused, unexpired token (valid for 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { data: tokenRow, error: tokenErr } = await serviceClient
          .from('telegram_link_tokens')
          .select('token, user_id, used, created_at')
          .eq('token', token)
          .eq('used', false)
          .gte('created_at', fifteenMinutesAgo)
          .maybeSingle()

        if (tokenErr || !tokenRow) {
          await sendTelegramMessage(
            chatId,
            'This connection link is expired or invalid. Please open your AgriTrails account on the website and click Connect Telegram to generate a new link.',
          )
          return NextResponse.json({ ok: true })
        }

        // Mark token as used
        await serviceClient
          .from('telegram_link_tokens')
          .update({ used: true })
          .eq('token', token)

        // Save telegram_chat_id and telegram_linked_at on user profile
        const { data: updatedProfile } = await serviceClient
          .from('profiles')
          .update({
            telegram_chat_id: chatId,
            telegram_linked_at: new Date().toISOString(),
          })
          .eq('id', tokenRow.user_id)
          .select('role, full_name, phone')
          .maybeSingle()

        const isFarmer = updatedProfile?.role === 'farmer'
        const confirmationMessage = isFarmer
          ? `Your AgriTrails farmer account (${updatedProfile?.full_name || 'Host'}) is connected. You will receive real-time booking requests here with instant Accept and Decline buttons.`
          : `Your AgriTrails tourist account (${updatedProfile?.full_name || 'Guest'}) is connected. You will receive booking confirmations, host contact details, directions, and pre-arrival reminders here.`

        const helpList = getHelpMessage(updatedProfile?.role || 'tourist')
        await sendTelegramMessage(chatId, `${confirmationMessage}\n\n${helpList}`)
        return NextResponse.json({ ok: true })
      }

      // Handle /start without token
      if (command === '/start') {
        await sendTelegramMessage(
          chatId,
          `Welcome to AgriTrails. Connect your account from the website first (${siteUrl}) or send your 10-digit registered phone number directly here.`,
        )
        return NextResponse.json({ ok: true })
      }

      // Look up user profile by telegram_chat_id
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('id, full_name, role, phone, telegram_chat_id')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      // Handle /stop
      if (command === '/stop') {
        if (userProfile) {
          await serviceClient
            .from('profiles')
            .update({
              telegram_chat_id: null,
              telegram_linked_at: null,
            })
            .eq('telegram_chat_id', chatId)

          await sendTelegramMessage(
            chatId,
            'Your AgriTrails account has been disconnected. You will no longer receive notifications on Telegram.',
          )
        } else {
          await sendTelegramMessage(
            chatId,
            'Your account is not connected.',
          )
        }
        return NextResponse.json({ ok: true })
      }

      // If no profile is linked, reply with instruction
      if (!userProfile) {
        await sendTelegramMessage(
          chatId,
          `Connect your account from the website first (${siteUrl}) or send your registered mobile number to link directly.`,
        )
        return NextResponse.json({ ok: true })
      }

      const today = getTodayKolkata()
      const isFarmer = userProfile.role === 'farmer'

      // Command: /msg or /message <phone> <text> — message someone based on their phone number
      if (command === '/msg' || command === '/message') {
        const parts = text.split(' ')
        if (parts.length < 3) {
          await sendTelegramMessage(chatId, 'Usage: /msg <phone> <message>')
          return NextResponse.json({ ok: true })
        }

        const targetPhone = parts[1].replace(/\D/g, '').slice(-10)
        const messageBody = parts.slice(2).join(' ')

        const { data: allProfiles } = await serviceClient
          .from('profiles')
          .select('id, full_name, phone, role, telegram_chat_id')

        const recipient = allProfiles?.find((p) => p.phone && p.phone.replace(/\D/g, '').endsWith(targetPhone))

        if (!recipient) {
          await sendTelegramMessage(chatId, `No account found in database with phone number ${parts[1]}.`)
          return NextResponse.json({ ok: true })
        }

        if (recipient.telegram_chat_id) {
          await sendTelegramMessage(
            recipient.telegram_chat_id,
            `Message from ${userProfile.full_name} (${userProfile.phone || 'Host'}): ${messageBody}`,
          )
          await sendTelegramMessage(
            chatId,
            `Message sent on Telegram to ${recipient.full_name} (${recipient.phone}).`,
          )
        } else {
          await sendTelegramMessage(
            chatId,
            `${recipient.full_name} (${recipient.phone}) has not connected Telegram yet. Please contact them directly at ${recipient.phone}.`,
          )
        }
        return NextResponse.json({ ok: true })
      }

      // Command: /bookings or /booking
      if (command === '/bookings' || command === '/booking') {
        if (!isFarmer) {
          // Tourist: next 5 bookings
          let { data: bookings } = await serviceClient
            .from('bookings')
            .select(`
              id,
              check_in,
              arrival_time,
              guests,
              status,
              farm:farms(name, host_phone)
            `)
            .eq('tourist_id', userProfile.id)
            .gte('check_in', today)
            .in('status', ['pending', 'confirmed'])
            .order('check_in', { ascending: true })
            .limit(5)

          let isUpcoming = true
          if (!bookings || bookings.length === 0) {
            // Fallback to recent bookings if none are in the future
            const { data: recent } = await serviceClient
              .from('bookings')
              .select(`
                id,
                check_in,
                arrival_time,
                guests,
                status,
                farm:farms(name, host_phone)
              `)
              .eq('tourist_id', userProfile.id)
              .in('status', ['pending', 'confirmed'])
              .order('check_in', { ascending: false })
              .limit(5)
            bookings = recent
            isUpcoming = false
          }

          if (!bookings || bookings.length === 0) {
            await sendTelegramMessage(chatId, 'You have no bookings.')
            return NextResponse.json({ ok: true })
          }

          const header = isUpcoming ? 'Upcoming farm stays:' : 'Recent farm stays:'
          const lines = bookings.map((b) => {
            const farmName = (b.farm as any)?.name || 'Farm Stay'
            const hostPhone = (b.farm as any)?.host_phone ? ` (Host phone: ${(b.farm as any).host_phone})` : ''
            const arrivalTime = b.arrival_time ? b.arrival_time : 'Flexible'
            const statusText = b.status.charAt(0).toUpperCase() + b.status.slice(1)
            const bookingUrl = `${siteUrl}/dashboard?view=tourist`
            return `${farmName}${hostPhone}, ${b.check_in}, ${arrivalTime}, ${b.guests} guest${b.guests > 1 ? 's' : ''}, Status: ${statusText}, ${bookingUrl}`
          })

          await sendTelegramMessage(chatId, `${header}\n${lines.join('\n')}`)
          return NextResponse.json({ ok: true })
        } else {
          // Farmer: bookings for their farms with tourist name and phone
          const { data: farms } = await serviceClient
            .from('farms')
            .select('id')
            .eq('owner_id', userProfile.id)

          const farmIds = farms?.map((f) => f.id) || []
          if (farmIds.length === 0) {
            await sendTelegramMessage(chatId, 'You have no farm listings registered.')
            return NextResponse.json({ ok: true })
          }

          let { data: bookings } = await serviceClient
            .from('bookings')
            .select(`
              id,
              check_in,
              guests,
              status,
              farm:farms(name),
              tourist:profiles(full_name, phone)
            `)
            .in('farm_id', farmIds)
            .gte('check_in', today)
            .in('status', ['pending', 'confirmed'])
            .order('check_in', { ascending: true })
            .limit(5)

          let isUpcoming = true
          if (!bookings || bookings.length === 0) {
            // Fallback to recent bookings if none are in the future
            const { data: recent } = await serviceClient
              .from('bookings')
              .select(`
                id,
                check_in,
                guests,
                status,
                farm:farms(name),
                tourist:profiles(full_name, phone)
              `)
              .in('farm_id', farmIds)
              .in('status', ['pending', 'confirmed'])
              .order('check_in', { ascending: false })
              .limit(5)
            bookings = recent
            isUpcoming = false
          }

          if (!bookings || bookings.length === 0) {
            await sendTelegramMessage(chatId, 'You have no bookings.')
            return NextResponse.json({ ok: true })
          }

          const header = isUpcoming ? 'Upcoming farm bookings:' : 'Recent farm bookings:'
          const lines = bookings.map((b) => {
            const touristName = (b.tourist as any)?.full_name || 'Guest'
            const touristPhone = (b.tourist as any)?.phone ? ` (Phone: ${(b.tourist as any).phone})` : ''
            const farmName = (b.farm as any)?.name ? ` at ${(b.farm as any).name}` : ''
            const statusText = b.status.charAt(0).toUpperCase() + b.status.slice(1)
            return `${touristName}${touristPhone}${farmName}, ${b.check_in}, ${b.guests} guest${b.guests > 1 ? 's' : ''}, Status: ${statusText}`
          })

          await sendTelegramMessage(chatId, `${header}\n${lines.join('\n')}`)
          return NextResponse.json({ ok: true })
        }
      }

      // Command: /pending (farmers only)
      if (command === '/pending') {
        if (!isFarmer) {
          await sendTelegramMessage(chatId, 'This command is for hosts.')
          return NextResponse.json({ ok: true })
        }

        const { data: farms } = await serviceClient
          .from('farms')
          .select('id')
          .eq('owner_id', userProfile.id)

        const farmIds = farms?.map((f) => f.id) || []
        if (farmIds.length === 0) {
          await sendTelegramMessage(chatId, 'No requests are waiting.')
          return NextResponse.json({ ok: true })
        }

        const { data: pendingBookings } = await serviceClient
          .from('bookings')
          .select(`
            id,
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
          .limit(5)

        if (!pendingBookings || pendingBookings.length === 0) {
          await sendTelegramMessage(chatId, 'No requests are waiting.')
          return NextResponse.json({ ok: true })
        }

        for (const b of pendingBookings) {
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
              visit_type: b.visit_type,
              nights: b.nights,
              check_in: b.check_in,
              arrival_time: b.arrival_time,
              guests: b.guests,
              total_paise: b.total_paise,
              discount_pct: b.discount_pct,
              farm: { name: (b.farm as any)?.name },
              tourist: { full_name: (b.tourist as any)?.full_name, phone: (b.tourist as any)?.phone },
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

      // Command: /today (farmers only)
      if (command === '/today') {
        if (!isFarmer) {
          await sendTelegramMessage(chatId, 'This command is for hosts.')
          return NextResponse.json({ ok: true })
        }

        const { data: farms } = await serviceClient
          .from('farms')
          .select('id')
          .eq('owner_id', userProfile.id)

        const farmIds = farms?.map((f) => f.id) || []
        if (farmIds.length === 0) {
          await sendTelegramMessage(chatId, 'No visits today.')
          return NextResponse.json({ ok: true })
        }

        const { data: todayBookings } = await serviceClient
          .from('bookings')
          .select(`
            id,
            arrival_time,
            guests,
            farm:farms(name),
            tourist:profiles(full_name, phone)
          `)
          .in('farm_id', farmIds)
          .eq('check_in', today)
          .eq('status', 'confirmed')
          .order('arrival_time', { ascending: true })

        if (!todayBookings || todayBookings.length === 0) {
          await sendTelegramMessage(chatId, 'No visits today.')
          return NextResponse.json({ ok: true })
        }

        const lines: string[] = []
        for (const b of todayBookings) {
          const { data: reservations } = await serviceClient
            .from('product_reservations')
            .select('qty, product:products(name)')
            .eq('booking_id', b.id)

          const productsText = reservations?.length
            ? reservations.map((r: any) => `${r.product?.name || 'Produce'} x ${r.qty}`).join(', ')
            : 'None'

          const touristName = (b.tourist as any)?.full_name || 'Guest'
          const touristPhone = (b.tourist as any)?.phone ? ` (Phone: ${(b.tourist as any).phone})` : ''
          const arrival = b.arrival_time ? b.arrival_time : 'Flexible'
          lines.push(`${touristName}${touristPhone}, Arrival: ${arrival}, Guests: ${b.guests}, Reserved products: ${productsText}`)
        }

        await sendTelegramMessage(chatId, `Today's confirmed visits:\n${lines.join('\n')}`)
        return NextResponse.json({ ok: true })
      }

      // Command: /help or unknown command
      await sendTelegramMessage(chatId, getHelpMessage(userProfile.role || 'tourist'))
      return NextResponse.json({ ok: true })
    }

    // Always return 200
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err)
    // Always return 200 and never throw
    return NextResponse.json({ ok: true })
  }
}
