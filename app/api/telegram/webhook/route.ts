import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  sendTelegramMessage,
  answerCallbackQuery,
  editTelegramMessage,
} from '@/lib/telegram'
import { updateBookingStatus } from '@/lib/booking-status'

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

    // 3. Handle Text Messages (/start, /stop)
    if (body.message && body.message.text) {
      const msg = body.message
      const chatId = msg.chat?.id
      const text: string = msg.text.trim()

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
          .select('role, full_name')
          .maybeSingle()

        const isFarmer = updatedProfile?.role === 'farmer'
        const confirmationMessage = isFarmer
          ? 'Your AgriTrails farmer account is connected. You will receive real-time booking requests here with instant Accept and Decline buttons.'
          : 'Your AgriTrails tourist account is connected. You will receive booking confirmations, host contact details, directions, and pre-arrival reminders here.'

        await sendTelegramMessage(chatId, confirmationMessage)
        return NextResponse.json({ ok: true })
      }

      // Handle /start without token
      if (text === '/start') {
        await sendTelegramMessage(
          chatId,
          'Welcome to AgriTrails. To connect your account and receive booking notifications, sign in on the website, go to your booking form or dashboard, and click Connect Telegram.',
        )
        return NextResponse.json({ ok: true })
      }

      // Handle /stop
      if (text === '/stop') {
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
        return NextResponse.json({ ok: true })
      }
    }

    // Always return 200
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err)
    // Always return 200 and never throw
    return NextResponse.json({ ok: true })
  }
}
