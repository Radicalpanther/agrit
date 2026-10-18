// Outbound-only Meta WhatsApp Cloud API helper and template definitions

export interface WhatsAppTemplateConfig {
  name: string
  category: 'UTILITY'
  language: string
  variables: string[] // Parameter names in order {{1}}, {{2}}, etc.
  bodyText: string
}

/**
 * All WhatsApp template definitions used by AgriTrails.
 * These must be registered and approved in the Meta Business Manager console.
 */
export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplateConfig> = {
  farmer_new_booking: {
    name: 'farmer_new_booking',
    category: 'UTILITY',
    language: 'en_US',
    variables: ['farmer_name', 'guest_name', 'visit_type', 'check_in', 'guests', 'farm_name', 'booking_id'],
    bodyText:
      'Namaste {{1}}, you have a new booking request for {{6}} from {{2}} ({{3}}, {{5}} guests on {{4}}). Booking ref: {{7}}. Please review and confirm in your AgriTrails farmer dashboard.',
  },
  tourist_booking_received: {
    name: 'tourist_booking_received',
    category: 'UTILITY',
    language: 'en_US',
    variables: ['guest_name', 'booking_id', 'farm_name', 'visit_type', 'check_in'],
    bodyText:
      'Namaste {{1}}, your booking request {{2}} for a {{4}} at {{3}} on {{5}} has been received. Your host will confirm availability shortly. No payment is required today.',
  },
  tourist_booking_confirmed: {
    name: 'tourist_booking_confirmed',
    category: 'UTILITY',
    language: 'en_US',
    variables: ['guest_name', 'farm_name', 'check_in', 'host_name', 'host_phone', 'directions_url'],
    bodyText:
      'Namaste {{1}}, great news! Your stay at {{2}} on {{3}} has been confirmed by {{4}}. Contact your host at {{5}}. View directions and offline safety card: {{6}}',
  },
  tourist_booking_declined: {
    name: 'tourist_booking_declined',
    category: 'UTILITY',
    language: 'en_US',
    variables: ['guest_name', 'farm_name', 'check_in'],
    bodyText:
      'Namaste {{1}}, unfortunately {{2}} is unable to host your visit on {{3}}. You can explore other authentic stays across Maharashtra and Kerala on agritrails.dev',
  },
  tourist_pre_arrival_reminder: {
    name: 'tourist_pre_arrival_reminder',
    category: 'UTILITY',
    language: 'en_US',
    variables: ['guest_name', 'farm_name', 'check_in', 'host_phone', 'directions_url'],
    bodyText:
      'Namaste {{1}}, reminder that your farm stay at {{2}} begins tomorrow ({{3}})! Host contact: {{4}}. Please download your offline travel safety card before leaving: {{5}}',
  },
}

/**
 * Normalises an Indian mobile phone number to E.164 (+91XXXXXXXXXX).
 * Strips whitespace, dashes, brackets, leading 0 or +91.
 * Returns null if the number is not a valid 10-digit Indian mobile.
 */
export function normalizeIndianPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null

  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^\+/, '')
  }

  // Must be 10 digits starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`
  }

  return null
}

/**
 * Generates the exact human-readable text preview of a template with values replaced.
 */
export function renderTemplatePreview(
  templateName: string,
  variables: (string | number)[],
): string {
  const tpl = WHATSAPP_TEMPLATES[templateName]
  if (!tpl) {
    return `[Template ${templateName}]: ${variables.join(' · ')}`
  }

  let text = tpl.bodyText
  variables.forEach((val, idx) => {
    const placeholder = new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g')
    text = text.replace(placeholder, String(val))
  })
  return text
}

export interface SendWhatsAppResult {
  success: boolean
  status: 'sent' | 'failed' | 'mock'
  messageId?: string
  error?: string
  previewText: string
  toPhone: string
  template: string
}

/**
 * Dispatches an outbound WhatsApp template message using Meta Cloud API.
 * Automatically falls back to MOCK MODE if WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID are absent.
 */
export async function sendWhatsAppTemplate({
  to,
  templateName,
  variables,
  languageCode = 'en_US',
}: {
  to: string
  templateName: string
  variables: (string | number)[]
  languageCode?: string
}): Promise<SendWhatsAppResult> {
  const normalizedPhone = normalizeIndianPhoneNumber(to)
  const previewText = renderTemplatePreview(templateName, variables)

  if (!normalizedPhone) {
    return {
      success: false,
      status: 'failed',
      error: `Invalid Indian phone number: "${to}"`,
      previewText,
      toPhone: to,
      template: templateName,
    }
  }

  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  // MOCK MODE: Environment variables missing
  if (!token || !phoneId) {
    console.info(
      `[WhatsApp Mock Mode] Sending to ${normalizedPhone} (Template: ${templateName})\nPreview: "${previewText}"`,
    )
    return {
      success: true,
      status: 'mock',
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      previewText,
      toPhone: normalizedPhone,
      template: templateName,
    }
  }

  // Meta WhatsApp Cloud API call
  try {
    // Meta API recipient number requires country code without leading plus sign
    const recipientDigits = normalizedPhone.replace(/^\+/, '')
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientDigits,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: variables.map((v) => ({
              type: 'text',
              text: String(v),
            })),
          },
        ],
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `Meta API returned status ${res.status}`
      console.error('[WhatsApp Cloud API Error]', data)
      return {
        success: false,
        status: 'failed',
        error: errMsg,
        previewText,
        toPhone: normalizedPhone,
        template: templateName,
      }
    }

    const messageId = data?.messages?.[0]?.id || 'wamid.unknown'
    return {
      success: true,
      status: 'sent',
      messageId,
      previewText,
      toPhone: normalizedPhone,
      template: templateName,
    }
  } catch (err: any) {
    console.error('[WhatsApp Network Error]', err)
    return {
      success: false,
      status: 'failed',
      error: err?.message || 'Network error reaching Meta Cloud API',
      previewText,
      toPhone: normalizedPhone,
      template: templateName,
    }
  }
}
