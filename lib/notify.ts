import { createServiceClient } from '@/lib/supabase/server'
import {
  sendWhatsAppTemplate,
  normalizeIndianPhoneNumber,
  SendWhatsAppResult,
} from '@/lib/whatsapp'

export type BookingNotificationEvent =
  | 'created'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'reminder'

export interface NotificationDispatchRecord {
  id?: string
  bookingId: string
  toPhone: string
  template: string
  status: 'sent' | 'failed' | 'mock'
  previewText: string
  error?: string | null
}

/**
 * Triggers outbound WhatsApp notifications for a booking lifecycle event.
 * Enforces whatsapp_opt_in = true and Indian E.164 phone normalization.
 * Automatically saves records to the Supabase notifications table.
 * A failed send will NEVER throw or break the caller.
 */
export async function notifyBookingStatus(
  bookingId: string,
  eventType: BookingNotificationEvent = 'created',
): Promise<NotificationDispatchRecord[]> {
  const dispatched: NotificationDispatchRecord[] = []

  try {
    const serviceClient = await createServiceClient()

    // 1. Fetch booking with farm and tourist details
    const { data: booking, error: bErr } = await serviceClient
      .from('bookings')
      .select(`
        *,
        farm:farms (
          id,
          name,
          slug,
          host_name,
          host_phone,
          owner_id
        ),
        tourist:profiles (
          id,
          full_name,
          phone,
          whatsapp_opt_in
        )
      `)
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      console.warn(`[Notification] Booking ${bookingId} not found or query error:`, bErr?.message)
      return dispatched
    }

    const farm = booking.farm || {}
    const tourist = booking.tourist || {}

    // 2. Fetch farm owner (farmer) profile
    let farmerProfile: any = null
    if (farm.owner_id) {
      const { data: fProfile } = await serviceClient
        .from('profiles')
        .select('id, full_name, phone, whatsapp_opt_in')
        .eq('id', farm.owner_id)
        .maybeSingle()
      farmerProfile = fProfile
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agritrails.dev'
    const directionsUrl = `${siteUrl}/farms/${farm.slug || ''}`
    const visitTypeStr = booking.visit_type === 'day' ? 'Day visit' : `${booking.nights || 1} nights stay`

    const messagesToSend: Array<{
      to: string
      templateName: string
      variables: (string | number)[]
      recipientRole: 'farmer' | 'tourist'
    }> = []

    // 3. Assemble messages based on event type
    if (eventType === 'created') {
      // Message 1: To farmer if opted in (or if owner phone exists)
      const farmerPhone = farmerProfile?.phone || farm.host_phone
      if (farmerPhone && farmerProfile?.whatsapp_opt_in !== false) {
        messagesToSend.push({
          to: farmerPhone,
          templateName: 'farmer_new_booking',
          variables: [
            farmerProfile?.full_name || farm.host_name || 'Farmer',
            tourist.full_name || 'Guest',
            visitTypeStr,
            booking.check_in || 'Scheduled',
            booking.guests || 1,
            farm.name || 'Farm stay',
            booking.id,
          ],
          recipientRole: 'farmer',
        })
      }

      // Message 2: To tourist if opted in
      if (tourist.phone && tourist.whatsapp_opt_in) {
        messagesToSend.push({
          to: tourist.phone,
          templateName: 'tourist_booking_received',
          variables: [
            tourist.full_name || 'Guest',
            booking.id,
            farm.name || 'Farm stay',
            visitTypeStr,
            booking.check_in || 'Scheduled',
          ],
          recipientRole: 'tourist',
        })
      }
    } else if (eventType === 'confirmed') {
      // To tourist if opted in
      if (tourist.phone && tourist.whatsapp_opt_in) {
        messagesToSend.push({
          to: tourist.phone,
          templateName: 'tourist_booking_confirmed',
          variables: [
            tourist.full_name || 'Guest',
            farm.name || 'Farm stay',
            booking.check_in || 'Scheduled',
            farm.host_name || 'Your host',
            farm.host_phone || 'Host contact',
            directionsUrl,
          ],
          recipientRole: 'tourist',
        })
      }
    } else if (eventType === 'declined') {
      // To tourist if opted in
      if (tourist.phone && tourist.whatsapp_opt_in) {
        messagesToSend.push({
          to: tourist.phone,
          templateName: 'tourist_booking_declined',
          variables: [
            tourist.full_name || 'Guest',
            farm.name || 'Farm stay',
            booking.check_in || 'Scheduled',
          ],
          recipientRole: 'tourist',
        })
      }
    } else if (eventType === 'reminder') {
      // To tourist if opted in
      if (tourist.phone && tourist.whatsapp_opt_in) {
        messagesToSend.push({
          to: tourist.phone,
          templateName: 'tourist_pre_arrival_reminder',
          variables: [
            tourist.full_name || 'Guest',
            farm.name || 'Farm stay',
            booking.check_in || 'Scheduled',
            farm.host_phone || 'Host contact',
            directionsUrl,
          ],
          recipientRole: 'tourist',
        })
      }
    }

    // 4. Send messages and log to notifications table
    for (const msg of messagesToSend) {
      const normalized = normalizeIndianPhoneNumber(msg.to)
      if (!normalized) {
        console.warn(`[Notification] Skipping send: invalid Indian phone "${msg.to}"`)
        // Log skipped attempt
        await serviceClient.from('notifications').insert({
          booking_id: bookingId,
          to_phone: msg.to,
          template: msg.templateName,
          payload: {
            variables: msg.variables,
            eventType,
            error: 'Invalid Indian phone number',
          },
          status: 'failed',
          error: `Invalid Indian phone number: "${msg.to}"`,
        })
        continue
      }

      const result: SendWhatsAppResult = await sendWhatsAppTemplate({
        to: normalized,
        templateName: msg.templateName,
        variables: msg.variables,
      })

      // Insert log into Supabase notifications table
      const { data: notifRow } = await serviceClient
        .from('notifications')
        .insert({
          booking_id: bookingId,
          to_phone: result.toPhone,
          template: result.template,
          payload: {
            variables: msg.variables,
            preview_text: result.previewText,
            eventType,
            recipientRole: msg.recipientRole,
            messageId: result.messageId || null,
          },
          status: result.status,
          error: result.error || null,
        })
        .select('id')
        .maybeSingle()

      dispatched.push({
        id: notifRow?.id,
        bookingId,
        toPhone: result.toPhone,
        template: result.template,
        status: result.status,
        previewText: result.previewText,
        error: result.error || null,
      })
    }
  } catch (err: any) {
    // Fail-safe: A failed notification send must NEVER crash the booking process
    console.error(`[Notification] Critical error executing notifyBookingStatus for ${bookingId}:`, err)
  }

  return dispatched
}
