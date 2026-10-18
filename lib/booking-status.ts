import { createServiceClient } from '@/lib/supabase/server'
import { notifyBookingStatus } from '@/lib/notify'
import { editTelegramMessage } from '@/lib/telegram'
import { revalidatePath } from 'next/cache'

export interface BookingStatusActor {
  type: 'farmer' | 'telegram' | 'admin'
  id?: string
  chatId?: string | number
  originalMessageText?: string
}

export interface UpdateBookingStatusResult {
  success: boolean
  alreadyHandled?: boolean
  currentStatus?: string
  status?: string
  error?: string
}

/**
 * Shared, idempotent server function to update booking status.
 * Used by both the farmer portal and Telegram webhook approval.
 *
 * Verifies booking existence and pending status.
 * Verifies farm ownership by actor.
 * Updates database, triggers tourist notification, and edits stored Telegram message.
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: 'confirmed' | 'declined',
  actor: BookingStatusActor,
): Promise<UpdateBookingStatusResult> {
  try {
    const serviceClient = await createServiceClient()

    // 1. Fetch booking with farm, owner, and tourist details
    const { data: booking, error: bErr } = await serviceClient
      .from('bookings')
      .select(`
        id,
        status,
        check_in,
        visit_type,
        nights,
        guests,
        total_paise,
        telegram_message_id,
        telegram_chat_id,
        farm:farms (
          id,
          name,
          slug,
          owner_id
        ),
        tourist:profiles (
          id,
          full_name,
          phone,
          telegram_chat_id
        )
      `)
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      return { success: false, error: 'Booking not found' }
    }

    const currentStatus = booking.status

    // 2. Idempotency: If already handled, return immediately and change nothing
    if (currentStatus !== 'pending') {
      // If Telegram message still has buttons, remove them
      if (booking.telegram_chat_id && booking.telegram_message_id) {
        const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        const statusText = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)
        const base = actor.originalMessageText || `Booking reference: ${booking.id}\nFarm: ${(booking.farm as any)?.name}`
        const updated = base.includes('Status:') ? base : `${base}\n\nStatus: ${statusText} at ${timeNow}`
        await editTelegramMessage(
          booking.telegram_chat_id,
          booking.telegram_message_id,
          updated,
          { reply_markup: { inline_keyboard: [] } },
        )
      }

      return {
        success: false,
        alreadyHandled: true,
        currentStatus,
        status: currentStatus,
      }
    }

    // 3. Ownership verification
    const farm = (booking.farm as any) || {}
    const ownerId = farm.owner_id

    let ownerProfile: any = null
    if (ownerId) {
      const { data: op } = await serviceClient
        .from('profiles')
        .select('id, full_name, role, telegram_chat_id')
        .eq('id', ownerId)
        .maybeSingle()
      ownerProfile = op
    }

    if (actor.type === 'farmer') {
      // Allow if matches ownerId or demo farmer
      const isOwner = actor.id && (actor.id === ownerId || !ownerId)
      if (!isOwner) {
        return { success: false, error: 'Forbidden: You do not own this farm' }
      }
    } else if (actor.type === 'telegram') {
      const actorChat = String(actor.chatId)
      const ownerChat = ownerProfile?.telegram_chat_id ? String(ownerProfile.telegram_chat_id) : null
      const bookingChat = booking.telegram_chat_id ? String(booking.telegram_chat_id) : null

      const isAuthorizedChat =
        (ownerChat && ownerChat === actorChat) ||
        (bookingChat && bookingChat === actorChat)

      if (!isAuthorizedChat) {
        return { success: false, error: 'Forbidden: Unauthorized Telegram chat ID' }
      }
    }

    // 4. Update booking status in database
    const { error: updateErr } = await serviceClient
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // 5. Trigger notification for tourist
    await notifyBookingStatus(bookingId, newStatus)

    // 6. Update Telegram message on farmer's chat if message_id exists
    const tgChatId = booking.telegram_chat_id || (actor.type === 'telegram' ? actor.chatId : ownerProfile?.telegram_chat_id)
    const tgMessageId = booking.telegram_message_id

    if (tgChatId && tgMessageId) {
      const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      const statusText = newStatus === 'confirmed' ? 'Confirmed' : 'Declined'
      let updatedText: string

      if (actor.originalMessageText) {
        updatedText = `${actor.originalMessageText}\n\nStatus: ${statusText} at ${timeNow}`
      } else {
        const tourist = (booking.tourist as any) || {}
        updatedText = [
          `Booking request for ${farm.name || 'Farm Stay'}`,
          `Ref: ${booking.id}`,
          `Guest: ${tourist.full_name || 'Guest'}`,
          `Status: ${statusText} at ${timeNow}`,
        ].join('\n')
      }

      await editTelegramMessage(tgChatId, tgMessageId, updatedText, {
        reply_markup: { inline_keyboard: [] },
      })
    }

    // 7. Revalidate dashboard path
    try {
      revalidatePath('/dashboard')
    } catch {
      // Ignore if called outside of request context
    }

    return {
      success: true,
      status: newStatus,
    }
  } catch (err: any) {
    console.error(`[updateBookingStatus Error] Booking ${bookingId}:`, err)
    return {
      success: false,
      error: err?.message || 'Server error updating booking status',
    }
  }
}
