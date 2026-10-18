import { createServiceClient } from '@/lib/supabase/server'
import {
  sendTelegramMessage,
  getNotificationChannel,
  type NotificationChannel,
} from '@/lib/telegram'
import {
  sendWhatsAppTemplate,
  normalizeIndianPhoneNumber,
  type SendWhatsAppResult,
} from '@/lib/whatsapp'
import { formatRupees } from '@/lib/money'
import enMessages from '@/messages/en.json'
import hiMessages from '@/messages/hi.json'
import mrMessages from '@/messages/mr.json'

export type Locale = 'en' | 'hi' | 'mr'

/**
 * Global kill-switch for tourist notifications.
 * Off by default: tourists only see their status inside the AgriTrails web app.
 */
export const ENABLE_TOURIST_NOTIFICATIONS = process.env.ENABLE_TOURIST_NOTIFICATIONS === 'true'

/**
 * WhatsApp outbound notifications are fully disabled by default.
 */
export const ENABLE_WHATSAPP_NOTIFICATIONS = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true'

const messageCatalogs: Record<Locale, any> = {
  en: enMessages,
  hi: hiMessages,
  mr: mrMessages,
}

export function getNotificationText(
  locale: Locale,
  keyPath: string,
  vars: Record<string, string | number> = {},
): string {
  const cat = messageCatalogs[locale] || messageCatalogs.en
  const parts = keyPath.split('.')
  let cur: any = cat
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') break
    cur = cur[p]
  }
  if (typeof cur !== 'string') {
    let fallback: any = messageCatalogs.en
    for (const p of parts) {
      if (!fallback || typeof fallback !== 'object') break
      fallback = fallback[p]
    }
    cur = typeof fallback === 'string' ? fallback : keyPath
  }

  return cur.replace(/\{([a-zA-Z0-9_]+)\}/g, (_: string, name: string) => {
    return vars[name] !== undefined ? String(vars[name]) : ''
  })
}

export function formatVisitType(
  visitType: string | undefined,
  nights: number | undefined,
  locale: Locale,
): string {
  if (visitType === 'day') {
    return 'Day visit'
  }
  const n = nights || 1
  return n === 1 ? '1 night stay' : `${n} nights stay`
}

export type BookingNotificationEvent =
  | 'created'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'reminder'

export interface NotificationDispatchRecord {
  id?: string
  bookingId: string
  toPhone?: string
  telegramChatId?: string | number
  template: string
  status: 'sent' | 'failed' | 'mock'
  previewText: string
  error?: string | null
}

export interface FarmerBookingMessagePayload {
  id: string
  guest_name?: string
  guest_phone?: string
  visit_type?: string
  nights?: number
  check_in?: string
  arrival_time?: string | null
  guests?: number
  total_paise?: number
  discount_pct?: number
  farm?: { name?: string }
  tourist?: { full_name?: string; phone?: string | null }
}

export function buildFarmerBookingMessage(
  booking: FarmerBookingMessagePayload,
  reservedProductsText?: string,
  locale: Locale = 'en',
): { text: string; replyMarkup: { inline_keyboard: { text: string; callback_data: string }[][] } } {
  const stayType = booking.visit_type === 'day' ? 'Day visit' : `${booking.nights || 1} night(s)`
  const totalRupees = Math.round((booking.total_paise || 0) / 100)
  const farmName = booking.farm?.name || 'Farm stay'
  const guestName = booking.guest_name || booking.tourist?.full_name || 'Guest'
  const guestPhone = booking.guest_phone || booking.tourist?.phone || 'Not provided'

  const lines = [
    `New booking request for ${farmName}`,
    `Ref: ${booking.id.slice(0, 8)}`,
    `Guest: ${guestName}`,
    `Farm: ${farmName}`,
    `Visit type: ${stayType}`,
    `Check-in date: ${booking.check_in || 'Scheduled'}`,
    `Guests: ${booking.guests || 1}`,
    `Phone: ${guestPhone}`,
    `Total: Rs ${totalRupees}`,
  ]

  if (reservedProductsText) {
    lines.push(`Reserved produce: ${reservedProductsText}`)
  }

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Accept', callback_data: `bk:accept:${booking.id}` },
        { text: 'Decline', callback_data: `bk:decline:${booking.id}` },
      ],
    ],
  }

  return {
    text: lines.join('\n'),
    replyMarkup,
  }
}

/**
 * Dispatches booking notifications across the configured channel:
 * Telegram (default), WhatsApp (legacy), or Mock mode.
 *
 * Saves every dispatch to the Supabase notifications table.
 * A failed notification call never throws or breaks booking workflows.
 */
export async function notifyBookingStatus(
  bookingId: string,
  eventType: BookingNotificationEvent = 'created',
  reservedProductsText?: string,
  guestLocale?: Locale,
): Promise<NotificationDispatchRecord[]> {
  const dispatched: NotificationDispatchRecord[] = []

  try {
    const serviceClient = await createServiceClient()
    const channel: NotificationChannel = getNotificationChannel()

    // 1. Fetch booking with farm, owner, and tourist details
    let { data: booking, error: bErr }: { data: any; error: any } = await serviceClient
      .from('bookings')
      .select(`
        id,
        farm_id,
        tourist_id,
        guest_name,
        guest_phone,
        check_in,
        visit_type,
        nights,
        guests,
        total_paise,
        discount_pct,
        arrival_time,
        status,
        locale,
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

    if (bErr) {
      const fallback = await serviceClient
        .from('bookings')
        .select(`
          id,
          farm_id,
          tourist_id,
          check_in,
          visit_type,
          nights,
          guests,
          total_paise,
          discount_pct,
          status,
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
            phone
          )
        `)
        .eq('id', bookingId)
        .maybeSingle()
      booking = fallback.data
      bErr = fallback.error
    }

    if (bErr || !booking) {
      console.warn(`[Notification] Booking ${bookingId} not found:`, bErr?.message)
      return dispatched
    }

    const farm = (booking.farm as any) || {}
    const tourist = (booking.tourist as any) || {}
    const guestName = booking.guest_name || tourist.full_name || 'Guest'
    const guestPhone = booking.guest_phone || tourist.phone || null

    // Fetch farm owner (farmer) profile
    let farmerProfile: any = null
    if (farm.owner_id) {
      const { data: fProfile } = await serviceClient
        .from('profiles')
        .select('id, full_name, phone, telegram_chat_id, whatsapp_opt_in')
        .eq('id', farm.owner_id)
        .maybeSingle()
      farmerProfile = fProfile
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')

    // Resolve recipient languages
    const farmerLocale: Locale = 'en'

    const touristLocale: Locale =
      (guestLocale === 'hi' || guestLocale === 'mr' || guestLocale === 'en')
        ? guestLocale
        : booking.locale === 'hi' || booking.locale === 'mr'
        ? booking.locale
        : 'en'

    const visitTypeStrFarmer = formatVisitType(booking.visit_type, booking.nights, farmerLocale)
    const visitTypeStrTourist = formatVisitType(booking.visit_type, booking.nights, touristLocale)

    // ──────────────────────────────────────────────────────────────────────────
    // TELEGRAM CHANNEL (FARMER-ONLY ALERTS & ACTIONS)
    // ──────────────────────────────────────────────────────────────────────────
    if (channel === 'telegram' || channel === 'mock') {
      const farmerChatId = farmerProfile?.telegram_chat_id

      if (eventType === 'created') {
        const { text: farmerText, replyMarkup: inlineKeyboard } = buildFarmerBookingMessage(
          {
            id: booking.id,
            guest_name: guestName,
            guest_phone: guestPhone || undefined,
            visit_type: booking.visit_type,
            nights: booking.nights,
            check_in: booking.check_in,
            arrival_time: booking.arrival_time,
            guests: booking.guests,
            total_paise: booking.total_paise,
            discount_pct: booking.discount_pct,
            farm: { name: farm.name },
            tourist: { full_name: guestName, phone: guestPhone },
          },
          reservedProductsText,
          farmerLocale,
        )

        // Send to farmer if chat ID is known (or log mock if not linked)
        const targetFarmerChat = farmerChatId || (channel === 'mock' ? 'demo-farmer-chat' : null)
        if (targetFarmerChat) {
          const res = await sendTelegramMessage(targetFarmerChat, farmerText, {
            reply_markup: inlineKeyboard,
          })

          if (res.messageId && farmerChatId) {
            await serviceClient
              .from('bookings')
              .update({
                telegram_message_id: res.messageId,
                telegram_chat_id: farmerChatId,
              })
              .eq('id', booking.id)
          }

          const { data: nRow } = await serviceClient
            .from('notifications')
            .insert({
              booking_id: bookingId,
              to_phone: farmerProfile?.phone || farm.host_phone || null,
              template: 'telegram_farmer_new_booking',
              payload: {
                channel: 'telegram',
                recipient: 'farmer',
                chatId: targetFarmerChat,
                preview_text: farmerText,
                messageId: res.messageId || null,
              },
              status: res.status,
              error: res.error || null,
            })
            .select('id')
            .maybeSingle()

          dispatched.push({
            id: nRow?.id,
            bookingId,
            telegramChatId: targetFarmerChat,
            template: 'telegram_farmer_new_booking',
            status: res.status,
            previewText: farmerText,
            error: res.error || null,
          })
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TOURIST NOTIFICATIONS (DISABLED BY DEFAULT - IN-APP STATUS ONLY)
    // ──────────────────────────────────────────────────────────────────────────
    if (!ENABLE_TOURIST_NOTIFICATIONS) {
      return dispatched
    }

    const directionsUrl = `${siteUrl}/farms/${farm.slug || ''}`
    const messagesToSend: Array<{
      to: string
      templateName: string
      variables: (string | number)[]
      recipientRole: 'farmer' | 'tourist'
      previewText: string
    }> = []

    // If channel is WhatsApp, also notify farmer via WhatsApp
    if (channel === 'whatsapp' && eventType === 'created') {
      const farmerPhone = farmerProfile?.phone || farm.host_phone
      if (farmerPhone && farmerProfile?.whatsapp_opt_in !== false) {
        const fPreview = getNotificationText(farmerLocale, 'notifications.whatsapp.farmerNewBooking', {
          farmerName: farmerProfile?.full_name || farm.host_name || 'Farmer',
          farmName: farm.name || 'Farm stay',
          guestName: guestName,
          visitType: visitTypeStrFarmer,
          guests: booking.guests || 1,
          checkIn: booking.check_in || 'Scheduled',
          bookingId: booking.id,
        })

        messagesToSend.push({
          to: farmerPhone,
          templateName: 'farmer_new_booking',
          variables: [
            farmerProfile?.full_name || farm.host_name || 'Farmer',
            guestName,
            visitTypeStrFarmer,
            booking.check_in || 'Scheduled',
            booking.guests || 1,
            farm.name || 'Farm stay',
            booking.id,
          ],
          recipientRole: 'farmer',
          previewText: fPreview,
        })
      }
    }

    // Always route tourist notifications through WhatsApp / Mock
    const targetTouristPhone = guestPhone || tourist.phone || '+919800000001'

    if (eventType === 'created') {
      const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristBookingReceived', {
        guestName: guestName,
        bookingId: booking.id,
        farmName: farm.name || 'Farm stay',
        visitType: visitTypeStrTourist,
        checkIn: booking.check_in || 'Scheduled',
      })

      messagesToSend.push({
        to: targetTouristPhone,
        templateName: 'tourist_booking_received',
        variables: [
          guestName,
          booking.id,
          farm.name || 'Farm stay',
          visitTypeStrTourist,
          booking.check_in || 'Scheduled',
        ],
        recipientRole: 'tourist',
        previewText: tPreview,
      })
    } else if (eventType === 'confirmed') {
      const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristBookingConfirmed', {
        guestName: guestName,
        farmName: farm.name || 'Farm stay',
        checkIn: booking.check_in || 'Scheduled',
        hostName: farm.host_name || 'Your host',
        hostPhone: farm.host_phone || 'Host contact',
        directionsUrl,
      })

      messagesToSend.push({
        to: targetTouristPhone,
        templateName: 'tourist_booking_confirmed',
        variables: [
          guestName,
          farm.name || 'Farm stay',
          booking.check_in || 'Scheduled',
          farm.host_name || 'Your host',
          farm.host_phone || 'Host contact',
          directionsUrl,
        ],
        recipientRole: 'tourist',
        previewText: tPreview,
      })
    } else if (eventType === 'declined') {
      const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristBookingDeclined', {
        guestName: guestName,
        farmName: farm.name || 'Farm stay',
        checkIn: booking.check_in || 'Scheduled',
      })

      messagesToSend.push({
        to: targetTouristPhone,
        templateName: 'tourist_booking_declined',
        variables: [
          guestName,
          farm.name || 'Farm stay',
          booking.check_in || 'Scheduled',
        ],
        recipientRole: 'tourist',
        previewText: tPreview,
      })
    } else if (eventType === 'reminder') {
      const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristPreArrivalReminder', {
        guestName: guestName,
        farmName: farm.name || 'Farm stay',
        checkIn: booking.check_in || 'Scheduled',
        hostPhone: farm.host_phone || 'Host contact',
        directionsUrl,
      })

      messagesToSend.push({
        to: targetTouristPhone,
        templateName: 'tourist_pre_arrival_reminder',
        variables: [
          guestName,
          farm.name || 'Farm stay',
          booking.check_in || 'Scheduled',
          farm.host_phone || 'Host contact',
          directionsUrl,
        ],
        recipientRole: 'tourist',
        previewText: tPreview,
      })
    }

    for (const msg of messagesToSend) {
      const normalized = normalizeIndianPhoneNumber(msg.to) || '+919800000001'

      const result: SendWhatsAppResult = await sendWhatsAppTemplate({
        to: normalized,
        templateName: msg.templateName,
        variables: msg.variables,
        previewTextOverride: msg.previewText,
      })

      let finalPreview = result.previewText
      if (reservedProductsText) {
        finalPreview += `\nReserved products for pickup: ${reservedProductsText}`
      }

      const { data: notifRow } = await serviceClient
        .from('notifications')
        .insert({
          booking_id: bookingId,
          to_phone: result.toPhone || normalized,
          template: result.template,
          payload: {
            variables: msg.variables,
            preview_text: finalPreview,
            channel: 'whatsapp',
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
        toPhone: result.toPhone || normalized,
        template: result.template,
        status: result.status,
        previewText: finalPreview,
        error: result.error || null,
      })
    }
    return dispatched
  } catch (err: any) {
    console.error(`[Notification] Execution error for ${bookingId}:`, err)
  }

  return dispatched
}
