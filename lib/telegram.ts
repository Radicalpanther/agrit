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

export interface TelegramBotCommand {
  command: string
  description: string
}

export interface TelegramBotCommandScope {
  type: 'default' | 'all_private_chats' | 'all_group_chats' | 'all_chat_administrators' | 'chat'
  chat_id?: string | number
}

/**
 * Registers bot commands for a given scope (e.g. default or per-chat for linked hosts).
 */
export async function setMyCommands(
  commands: TelegramBotCommand[],
  scope?: TelegramBotCommandScope,
): Promise<{ success: boolean; error?: string }> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    console.info(`[Telegram Mock Mode] setMyCommands for scope ${JSON.stringify(scope || { type: 'default' })}:`, commands.map(c => `/${c.command}`).join(', '))
    return { success: true }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/setMyCommands`
    const body: Record<string, any> = { commands }
    if (scope) body.scope = scope

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

/**
 * Deletes bot commands for a given scope (e.g. reset per-chat commands on /stop).
 */
export async function deleteMyCommands(
  scope?: TelegramBotCommandScope,
): Promise<{ success: boolean; error?: string }> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    console.info(`[Telegram Mock Mode] deleteMyCommands for scope ${JSON.stringify(scope || { type: 'default' })}`)
    return { success: true }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/deleteMyCommands`
    const body: Record<string, any> = {}
    if (scope) body.scope = scope

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

/**
 * Configures the Telegram chat menu button (e.g. { type: "commands" }).
 */
export async function setChatMenuButton(
  menuButton: { type: string },
  chatId?: string | number,
): Promise<{ success: boolean; error?: string }> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    console.info(`[Telegram Mock Mode] setChatMenuButton: ${JSON.stringify(menuButton)} for chat ${chatId || 'default'}`)
    return { success: true }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/setChatMenuButton`
    const body: Record<string, any> = { menu_button: menuButton }
    if (chatId) body.chat_id = chatId

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

/**
 * Registers the Telegram webhook with secret token and allowed updates.
 */
export async function setWebhook(
  webhookUrl: string,
  secretToken?: string,
  allowedUpdates: string[] = ['message', 'callback_query'],
): Promise<{ success: boolean; description?: string; error?: string }> {
  const channel = getNotificationChannel()
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (channel === 'mock' || !token) {
    console.info(`[Telegram Mock Mode] setWebhook to ${webhookUrl} with updates ${allowedUpdates.join(',')}`)
    return { success: true, description: 'Webhook registered (mock mode)' }
  }

  try {
    const url = `https://api.telegram.org/bot${token}/setWebhook`
    const body: Record<string, any> = {
      url: webhookUrl,
      allowed_updates: allowedUpdates,
    }
    if (secretToken) {
      body.secret_token = secretToken
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { success: false, error: data?.description || `HTTP ${res.status}` }
    }
    return { success: true, description: data.description }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

