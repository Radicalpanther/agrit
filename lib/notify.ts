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
    return getNotificationText(locale, 'notifications.common.dayVisit')
  }
  const n = nights || 1
  if (locale === 'hi') {
    return `${n} रात का प्रवास`
  }
  if (locale === 'mr') {
    return `${n} रात्रीचा मुक्काम`
  }
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
  const visitTypeStr = formatVisitType(booking.visit_type, booking.nights, locale)
  const formattedTotal = formatRupees(booking.total_paise || 0, locale)
  const discountPct = Number(booking.discount_pct) || 0
  const discountNote = discountPct > 0
    ? getNotificationText(locale, 'notifications.farmerNewBooking.discountApplied', { discountPct })
    : ''
  const farmName = booking.farm?.name || getNotificationText(locale, 'notifications.common.farmStay')
  const guestName = booking.tourist?.full_name || getNotificationText(locale, 'notifications.common.guest')

  const lines = [
    getNotificationText(locale, 'notifications.farmerNewBooking.title', { farmName }),
    getNotificationText(locale, 'notifications.farmerNewBooking.reference', { bookingId: booking.id }),
    getNotificationText(locale, 'notifications.farmerNewBooking.guest', { guestName }),
  ]
  if (booking.tourist?.phone) {
    lines.push(getNotificationText(locale, 'notifications.farmerNewBooking.phone', { phone: booking.tourist.phone }))
  }
  lines.push(
    getNotificationText(locale, 'notifications.farmerNewBooking.visitType', { visitType: visitTypeStr }),
    getNotificationText(locale, 'notifications.farmerNewBooking.checkInDate', {
      checkIn: booking.check_in || getNotificationText(locale, 'notifications.common.scheduled'),
    }),
  )
  if (booking.arrival_time) {
    lines.push(getNotificationText(locale, 'notifications.farmerNewBooking.arrivalTime', { arrivalTime: booking.arrival_time }))
  }
  lines.push(getNotificationText(locale, 'notifications.farmerNewBooking.guests', { guests: booking.guests || 1 }))
  if (reservedProductsText) {
    lines.push(getNotificationText(locale, 'notifications.farmerNewBooking.reservedProducts', { reservedProducts: reservedProductsText }))
  }
  lines.push(getNotificationText(locale, 'notifications.farmerNewBooking.total', { total: formattedTotal, discountNote }))

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: getNotificationText(locale, 'notifications.farmerNewBooking.accept'), callback_data: `bk:${booking.id}:a` },
        { text: getNotificationText(locale, 'notifications.farmerNewBooking.decline'), callback_data: `bk:${booking.id}:d` },
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
          telegram_chat_id,
          whatsapp_opt_in,
          preferred_language
        )
      `)
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      console.warn(`[Notification] Booking ${bookingId} not found:`, bErr?.message)
      return dispatched
    }

    const farm = booking.farm || {}
    const tourist = booking.tourist || {}

    // Fetch farm owner (farmer) profile
    let farmerProfile: any = null
    if (farm.owner_id) {
      const { data: fProfile } = await serviceClient
        .from('profiles')
        .select('id, full_name, phone, telegram_chat_id, whatsapp_opt_in, preferred_language')
        .eq('id', farm.owner_id)
        .maybeSingle()
      farmerProfile = fProfile
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')

    // Resolve recipient languages
    const farmerLocale: Locale =
      farmerProfile?.preferred_language === 'hi' || farmerProfile?.preferred_language === 'mr'
        ? farmerProfile.preferred_language
        : 'en'

    const touristLocale: Locale =
      (guestLocale === 'hi' || guestLocale === 'mr' || guestLocale === 'en')
        ? guestLocale
        : booking.locale === 'hi' || booking.locale === 'mr'
        ? booking.locale
        : tourist.preferred_language === 'hi' || tourist.preferred_language === 'mr'
        ? tourist.preferred_language
        : 'en'

    const visitTypeStrFarmer = formatVisitType(booking.visit_type, booking.nights, farmerLocale)
    const visitTypeStrTourist = formatVisitType(booking.visit_type, booking.nights, touristLocale)
    const formattedTotalTourist = formatRupees(booking.total_paise || 0, touristLocale)

    // ──────────────────────────────────────────────────────────────────────────
    // TELEGRAM CHANNEL (ACTIVE DEFAULT)
    // ──────────────────────────────────────────────────────────────────────────
    if (channel === 'telegram' || channel === 'mock') {
      // Resolve farmer Telegram chat ID (direct or via phone number)
      let farmerChatId = farmerProfile?.telegram_chat_id
      if (!farmerChatId) {
        const fPhone = farmerProfile?.phone || farm.host_phone
        if (fPhone) {
          const last10 = fPhone.replace(/\D/g, '').slice(-10)
          if (last10) {
            const { data: mFarmer } = await serviceClient
              .from('profiles')
              .select('id, telegram_chat_id')
              .ilike('phone', `%${last10}%`)
              .not('telegram_chat_id', 'is', null)
              .maybeSingle()
            if (mFarmer?.telegram_chat_id) {
              farmerChatId = mFarmer.telegram_chat_id
              if (farmerProfile?.id) {
                await serviceClient.from('profiles').update({ telegram_chat_id: farmerChatId }).eq('id', farmerProfile.id)
              }
            }
          }
        }
      }

      // Resolve tourist Telegram chat ID (direct or via phone number)
      let touristChatId = tourist.telegram_chat_id
      if (!touristChatId && tourist.phone) {
        const last10 = tourist.phone.replace(/\D/g, '').slice(-10)
        if (last10) {
          const { data: mTourist } = await serviceClient
            .from('profiles')
            .select('id, telegram_chat_id')
            .ilike('phone', `%${last10}%`)
            .not('telegram_chat_id', 'is', null)
            .maybeSingle()
          if (mTourist?.telegram_chat_id) {
            touristChatId = mTourist.telegram_chat_id
            if (tourist.id) {
              await serviceClient.from('profiles').update({ telegram_chat_id: touristChatId }).eq('id', tourist.id)
            }
          }
        }
      }

      if (eventType === 'created') {
        // Message to farmer with inline Accept/Decline approval buttons in farmer's language
        const { text: farmerText, replyMarkup: inlineKeyboard } = buildFarmerBookingMessage(
          {
            id: booking.id,
            visit_type: booking.visit_type,
            nights: booking.nights,
            check_in: booking.check_in,
            arrival_time: booking.arrival_time,
            guests: booking.guests,
            total_paise: booking.total_paise,
            discount_pct: booking.discount_pct,
            farm: { name: farm.name },
            tourist: { full_name: tourist.full_name, phone: tourist.phone },
          },
          reservedProductsText,
          farmerLocale,
        )

        // Send to farmer if chat ID is known (or log mock if not yet linked)
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

        // Message to tourist: Request received in tourist's language
        const farmName = farm.name || getNotificationText(touristLocale, 'notifications.common.farmStay')
        const touristLines = [
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.title', { farmName }),
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.reference', { bookingId: booking.id }),
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.date', {
            checkIn: booking.check_in || getNotificationText(touristLocale, 'notifications.common.scheduled'),
          }),
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.visitType', { visitType: visitTypeStrTourist }),
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.guests', { guests: booking.guests || 1 }),
        ]
        if (reservedProductsText) {
          touristLines.push(getNotificationText(touristLocale, 'notifications.touristBookingReceived.reservedProducts', { reservedProducts: reservedProductsText }))
        }
        touristLines.push(
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.total', { total: formattedTotalTourist }),
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.note'),
          getNotificationText(touristLocale, 'notifications.touristBookingReceived.viewBooking', { url: `${siteUrl}/dashboard?view=tourist` }),
        )
        const touristText = touristLines.join('\n')

        const targetTouristChat = touristChatId || (channel === 'mock' ? 'demo-tourist-chat' : null)
        if (targetTouristChat) {
          const res = await sendTelegramMessage(targetTouristChat, touristText)

          const { data: nRow } = await serviceClient
            .from('notifications')
            .insert({
              booking_id: bookingId,
              to_phone: tourist.phone || null,
              template: 'telegram_tourist_booking_received',
              payload: {
                channel: 'telegram',
                recipient: 'tourist',
                chatId: targetTouristChat,
                preview_text: touristText,
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
            telegramChatId: targetTouristChat,
            template: 'telegram_tourist_booking_received',
            status: res.status,
            previewText: touristText,
            error: res.error || null,
          })
        }
      } else if (eventType === 'confirmed') {
        const farmName = farm.name || getNotificationText(touristLocale, 'notifications.common.farmStay')
        const lines = [
          getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.title', { farmName }),
          getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.reference', { bookingId: booking.id }),
          getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.date', {
            checkIn: booking.check_in || getNotificationText(touristLocale, 'notifications.common.scheduled'),
          }),
          getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.host', {
            hostName: farm.host_name || getNotificationText(touristLocale, 'notifications.common.yourHost'),
          }),
        ]
        if (farm.host_phone) {
          lines.push(getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.hostPhone', { hostPhone: farm.host_phone }))
        }
        lines.push(
          getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.note'),
          getNotificationText(touristLocale, 'notifications.touristBookingConfirmed.viewCard', { url: `${siteUrl}/dashboard?view=tourist` }),
        )
        const text = lines.join('\n')

        const targetTouristChat = touristChatId || (channel === 'mock' ? 'demo-tourist-chat' : null)
        if (targetTouristChat) {
          const res = await sendTelegramMessage(targetTouristChat, text)

          const { data: nRow } = await serviceClient
            .from('notifications')
            .insert({
              booking_id: bookingId,
              to_phone: tourist.phone || null,
              template: 'telegram_tourist_booking_confirmed',
              payload: {
                channel: 'telegram',
                recipient: 'tourist',
                chatId: targetTouristChat,
                preview_text: text,
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
            telegramChatId: targetTouristChat,
            template: 'telegram_tourist_booking_confirmed',
            status: res.status,
            previewText: text,
            error: res.error || null,
          })
        }
      } else if (eventType === 'declined') {
        const farmName = farm.name || getNotificationText(touristLocale, 'notifications.common.farmStay')
        const text = [
          getNotificationText(touristLocale, 'notifications.touristBookingDeclined.title', { farmName }),
          getNotificationText(touristLocale, 'notifications.touristBookingDeclined.reference', { bookingId: booking.id }),
          getNotificationText(touristLocale, 'notifications.touristBookingDeclined.date', {
            checkIn: booking.check_in || getNotificationText(touristLocale, 'notifications.common.scheduled'),
          }),
          getNotificationText(touristLocale, 'notifications.touristBookingDeclined.note'),
          getNotificationText(touristLocale, 'notifications.touristBookingDeclined.explore', { url: `${siteUrl}/explore` }),
        ].join('\n')

        const targetTouristChat = touristChatId || (channel === 'mock' ? 'demo-tourist-chat' : null)
        if (targetTouristChat) {
          const res = await sendTelegramMessage(targetTouristChat, text)

          const { data: nRow } = await serviceClient
            .from('notifications')
            .insert({
              booking_id: bookingId,
              to_phone: tourist.phone || null,
              template: 'telegram_tourist_booking_declined',
              payload: {
                channel: 'telegram',
                recipient: 'tourist',
                chatId: targetTouristChat,
                preview_text: text,
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
            telegramChatId: targetTouristChat,
            template: 'telegram_tourist_booking_declined',
            status: res.status,
            previewText: text,
            error: res.error || null,
          })
        }
      } else if (eventType === 'reminder') {
        const farmName = farm.name || getNotificationText(touristLocale, 'notifications.common.farmStay')
        const lines = [
          getNotificationText(touristLocale, 'notifications.touristPreArrivalReminder.title', {
            farmName,
            checkIn: booking.check_in || '',
          }),
          getNotificationText(touristLocale, 'notifications.touristPreArrivalReminder.reference', { bookingId: booking.id }),
        ]
        if (farm.host_phone) {
          lines.push(getNotificationText(touristLocale, 'notifications.touristPreArrivalReminder.hostContact', { hostPhone: farm.host_phone }))
        }
        lines.push(
          getNotificationText(touristLocale, 'notifications.touristPreArrivalReminder.note'),
          getNotificationText(touristLocale, 'notifications.touristPreArrivalReminder.viewCard', { url: `${siteUrl}/dashboard?view=tourist` }),
        )
        const text = lines.join('\n')

        const targetTouristChat = touristChatId || (channel === 'mock' ? 'demo-tourist-chat' : null)
        if (targetTouristChat) {
          const res = await sendTelegramMessage(targetTouristChat, text)

          const { data: nRow } = await serviceClient
            .from('notifications')
            .insert({
              booking_id: bookingId,
              to_phone: tourist.phone || null,
              template: 'telegram_tourist_pre_arrival_reminder',
              payload: {
                channel: 'telegram',
                recipient: 'tourist',
                chatId: targetTouristChat,
                preview_text: text,
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
            telegramChatId: targetTouristChat,
            template: 'telegram_tourist_pre_arrival_reminder',
            status: res.status,
            previewText: text,
            error: res.error || null,
          })
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WHATSAPP CHANNEL (PRESERVED BUT OFF BY DEFAULT UNLESS EXPLICITLY REQUESTED)
    // ──────────────────────────────────────────────────────────────────────────
    if (channel === 'whatsapp') {
      const directionsUrl = `${siteUrl}/farms/${farm.slug || ''}`
      const messagesToSend: Array<{
        to: string
        templateName: string
        variables: (string | number)[]
        recipientRole: 'farmer' | 'tourist'
        previewText: string
      }> = []

      if (eventType === 'created') {
        const farmerPhone = farmerProfile?.phone || farm.host_phone
        if (farmerPhone && farmerProfile?.whatsapp_opt_in !== false) {
          const fPreview = getNotificationText(farmerLocale, 'notifications.whatsapp.farmerNewBooking', {
            farmerName: farmerProfile?.full_name || farm.host_name || 'Farmer',
            farmName: farm.name || 'Farm stay',
            guestName: tourist.full_name || 'Guest',
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
              tourist.full_name || 'Guest',
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

        if (tourist.phone && tourist.whatsapp_opt_in) {
          const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristBookingReceived', {
            guestName: tourist.full_name || 'Guest',
            bookingId: booking.id,
            farmName: farm.name || 'Farm stay',
            visitType: visitTypeStrTourist,
            checkIn: booking.check_in || 'Scheduled',
          })

          messagesToSend.push({
            to: tourist.phone,
            templateName: 'tourist_booking_received',
            variables: [
              tourist.full_name || 'Guest',
              booking.id,
              farm.name || 'Farm stay',
              visitTypeStrTourist,
              booking.check_in || 'Scheduled',
            ],
            recipientRole: 'tourist',
            previewText: tPreview,
          })
        }
      } else if (eventType === 'confirmed') {
        if (tourist.phone && tourist.whatsapp_opt_in) {
          const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristBookingConfirmed', {
            guestName: tourist.full_name || 'Guest',
            farmName: farm.name || 'Farm stay',
            checkIn: booking.check_in || 'Scheduled',
            hostName: farm.host_name || 'Your host',
            hostPhone: farm.host_phone || 'Host contact',
            directionsUrl,
          })

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
            previewText: tPreview,
          })
        }
      } else if (eventType === 'declined') {
        if (tourist.phone && tourist.whatsapp_opt_in) {
          const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristBookingDeclined', {
            guestName: tourist.full_name || 'Guest',
            farmName: farm.name || 'Farm stay',
            checkIn: booking.check_in || 'Scheduled',
          })

          messagesToSend.push({
            to: tourist.phone,
            templateName: 'tourist_booking_declined',
            variables: [
              tourist.full_name || 'Guest',
              farm.name || 'Farm stay',
              booking.check_in || 'Scheduled',
            ],
            recipientRole: 'tourist',
            previewText: tPreview,
          })
        }
      } else if (eventType === 'reminder') {
        if (tourist.phone && tourist.whatsapp_opt_in) {
          const tPreview = getNotificationText(touristLocale, 'notifications.whatsapp.touristPreArrivalReminder', {
            guestName: tourist.full_name || 'Guest',
            farmName: farm.name || 'Farm stay',
            checkIn: booking.check_in || 'Scheduled',
            hostPhone: farm.host_phone || 'Host contact',
            directionsUrl,
          })

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
            previewText: tPreview,
          })
        }
      }

      for (const msg of messagesToSend) {
        const normalized = normalizeIndianPhoneNumber(msg.to)
        if (!normalized) continue

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
            to_phone: result.toPhone,
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
          toPhone: result.toPhone,
          template: result.template,
          status: result.status,
          previewText: finalPreview,
          error: result.error || null,
        })
      }
    }
  } catch (err: any) {
    console.error(`[Notification] Execution error for ${bookingId}:`, err)
  }

  return dispatched
}
