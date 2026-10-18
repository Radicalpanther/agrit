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
): { text: string; replyMarkup: { inline_keyboard: { text: string; callback_data: string }[][] } } {
  const visitTypeStr = booking.visit_type === 'day' ? 'Day visit' : `${booking.nights || 1} nights stay`
  const formattedTotal = formatRupees(booking.total_paise || 0)
  const discountNote = Number(booking.discount_pct) > 0 ? ` (${booking.discount_pct}% package discount applied)` : ''
  const farmName = booking.farm?.name || 'Farm Stay'
  const guestName = booking.tourist?.full_name || 'Guest'

  const lines = [
    `New booking request: ${farmName}`,
    `Reference: ${booking.id}`,
    `Guest: ${guestName}`,
  ]
  if (booking.tourist?.phone) {
    lines.push(`Phone: ${booking.tourist.phone}`)
  }
  lines.push(
    `Visit type: ${visitTypeStr}`,
    `Check-in date: ${booking.check_in || 'Scheduled'}`,
  )
  if (booking.arrival_time) {
    lines.push(`Arrival time: ${booking.arrival_time}`)
  }
  lines.push(`Guests: ${booking.guests || 1}`)
  if (reservedProductsText) {
    lines.push(`Reserved products: ${reservedProductsText}`)
  }
  lines.push(`Total: ${formattedTotal}${discountNote}`)

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Accept', callback_data: `bk:${booking.id}:a` },
        { text: 'Decline', callback_data: `bk:${booking.id}:d` },
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
          whatsapp_opt_in
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
        .select('id, full_name, phone, telegram_chat_id, whatsapp_opt_in')
        .eq('id', farm.owner_id)
        .maybeSingle()
      farmerProfile = fProfile
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
    const visitTypeStr = booking.visit_type === 'day' ? 'Day visit' : `${booking.nights || 1} nights stay`
    const formattedTotal = formatRupees(booking.total_paise || 0)
    const discountNote = Number(booking.discount_pct) > 0 ? ` (${booking.discount_pct}% package discount applied)` : ''

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
        // Message to farmer with inline Accept/Decline approval buttons
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
        )

        // Send to farmer if chat ID is known (or log mock if not yet linked)
        const targetFarmerChat = farmerChatId || (channel === 'mock' ? 'demo-farmer-chat' : null)
        if (targetFarmerChat) {
          const res = await sendTelegramMessage(targetFarmerChat, farmerText, {
            reply_markup: inlineKeyboard,
          })

          // Save sent message_id and chat_id on the booking for future edit
          if (res.messageId && farmerChatId) {
            await serviceClient
              .from('bookings')
              .update({
                telegram_message_id: res.messageId,
                telegram_chat_id: farmerChatId,
              })
              .eq('id', booking.id)
          }

          // Log in notifications table
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

        // Message to tourist: Request received
        const touristLines = [
          `Booking request received: ${farm.name || 'Farm Stay'}`,
          `Reference: ${booking.id}`,
          `Date: ${booking.check_in || 'Scheduled'}`,
          `Visit type: ${visitTypeStr}`,
          `Guests: ${booking.guests || 1}`,
        ]
        if (reservedProductsText) {
          touristLines.push(`Reserved products: ${reservedProductsText}`)
        }
        touristLines.push(
          `Total: ${formattedTotal}`,
          'Your host will review availability and confirm your request shortly. No payment is required today.',
          `View booking: ${siteUrl}/dashboard?view=tourist`,
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
        // Message to tourist: Booking confirmed
        const lines = [
          `Booking confirmed: ${farm.name || 'Farm Stay'}`,
          `Reference: ${booking.id}`,
          `Date: ${booking.check_in || 'Scheduled'}`,
          `Host: ${farm.host_name || 'Your Host'}`,
        ]
        if (farm.host_phone) {
          lines.push(`Host phone: ${farm.host_phone}`)
        }
        lines.push(
          'Your host has accepted your visit. Safe travels!',
          `View directions and travel safety card: ${siteUrl}/dashboard?view=tourist`,
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
        // Message to tourist: Booking declined (polite, suggesting other stays)
        const text = [
          `Booking request update: ${farm.name || 'Farm Stay'}`,
          `Reference: ${booking.id}`,
          `Date: ${booking.check_in || 'Scheduled'}`,
          'The host is unable to accommodate this visit. You can explore other authentic farm stays across India on AgriTrails.',
          `Explore farm stays: ${siteUrl}/explore`,
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
        // Pre-arrival reminder day before visit
        const lines = [
          `Reminder: Your farm stay at ${farm.name || 'Farm Stay'} begins tomorrow (${booking.check_in})`,
          `Reference: ${booking.id}`,
        ]
        if (farm.host_phone) {
          lines.push(`Host contact: ${farm.host_phone}`)
        }
        lines.push(
          'Please download your offline travel safety card before leaving:',
          `${siteUrl}/dashboard?view=tourist`,
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
      }> = []

      if (eventType === 'created') {
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

      for (const msg of messagesToSend) {
        const normalized = normalizeIndianPhoneNumber(msg.to)
        if (!normalized) continue

        const result: SendWhatsAppResult = await sendWhatsAppTemplate({
          to: normalized,
          templateName: msg.templateName,
          variables: msg.variables,
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
