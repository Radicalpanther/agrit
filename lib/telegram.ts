// Plain-fetch Telegram Bot API client and helper functions
// Complies with AgriTrails strict rules: no SDK, no emojis, plain-text messages only,
// never logs or exposes the bot token, fail-safe error handling.

export type NotificationChannel = 'telegram' | 'whatsapp' | 'mock'

/**
 * Resolves the active notification channel.
 * Values: 'telegram' | 'whatsapp' | 'mock'.
 * Defaults to 'telegram' when TELEGRAM_BOT_TOKEN is set, otherwise 'mock'.
 */
export function getNotificationChannel(): NotificationChannel {
  const envChannel = process.env.NOTIFY_CHANNEL?.toLowerCase()
  if (envChannel === 'telegram' || envChannel === 'whatsapp' || envChannel === 'mock') {
    return envChannel
  }
  return process.env.TELEGRAM_BOT_TOKEN ? 'telegram' : 'mock'
}

export interface TelegramSendResult {
  success: boolean
  status: 'sent' | 'mock' | 'failed'
  messageId?: number
  error?: string
}

export interface TelegramEditResult {
  success: boolean
  status: 'sent' | 'mock' | 'failed'
  error?: string
}

/**
 * Sends a plain-text message to a Telegram chat.
 * Uses plain fetch with no external SDK.
 * Never logs or exposes the bot token.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    reply_markup?: any
  },
): Promise<TelegramSendResult> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    const mockId = Math.floor(Date.now() / 1000)
    console.info(`[Telegram Mock Mode] Send to ${chatId}: "${text.replace(/\n/g, ' ')}"`)
    return {
      success: true,
      status: 'mock',
      messageId: mockId,
    }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const body: Record<string, any> = {
      chat_id: chatId,
      text,
    }

    if (options?.reply_markup) {
      body.reply_markup = options.reply_markup
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      const errMsg = data?.description || `Telegram API returned HTTP ${res.status}`
      console.warn(`[Telegram API Error] Status ${res.status}: ${errMsg}`)
      return {
        success: false,
        status: 'failed',
        error: errMsg,
      }
    }

    return {
      success: true,
      status: 'sent',
      messageId: data.result?.message_id,
    }
  } catch (err: any) {
    const errMsg = err?.message || 'Network error reaching Telegram API'
    console.warn(`[Telegram Network Error] ${errMsg}`)
    return {
      success: false,
      status: 'failed',
      error: errMsg,
    }
  }
}

/**
 * Edits an existing Telegram message (e.g. to reflect status updates and remove inline keyboards).
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: string | number,
  text: string,
  options?: {
    reply_markup?: any
  },
): Promise<TelegramEditResult> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    console.info(`[Telegram Mock Mode] Edit msg ${messageId} for ${chatId}: "${text.replace(/\n/g, ' ')}"`)
    return { success: true, status: 'mock' }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/editMessageText`
    const body: Record<string, any> = {
      chat_id: chatId,
      message_id: messageId,
      text,
    }

    if (options?.reply_markup) {
      body.reply_markup = options.reply_markup
    } else {
      // Empty inline keyboard removes previous buttons
      body.reply_markup = { inline_keyboard: [] }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      const errMsg = data?.description || `Telegram edit returned HTTP ${res.status}`
      console.warn(`[Telegram Edit Error] Status ${res.status}: ${errMsg}`)
      return {
        success: false,
        status: 'failed',
        error: errMsg,
      }
    }

    return {
      success: true,
      status: 'sent',
    }
  } catch (err: any) {
    const errMsg = err?.message || 'Network error editing Telegram message'
    console.warn(`[Telegram Edit Error] ${errMsg}`)
    return {
      success: false,
      status: 'failed',
      error: errMsg,
    }
  }
}

/**
 * Answers a Telegram callback query to dismiss loading state and show feedback.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    return { success: true }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`
    const body: Record<string, any> = {
      callback_query_id: callbackQueryId,
    }

    if (text) {
      body.text = text
    }
    if (showAlert) {
      body.show_alert = true
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { success: false, error: data?.description }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}
