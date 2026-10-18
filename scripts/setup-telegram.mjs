/**
 * Admin script to configure Telegram Bot Webhook, default commands, and chat menu button.
 * Run with: node scripts/setup-telegram.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Simple .env.local / .env reader
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
}

loadEnv()

const token = process.env.TELEGRAM_BOT_TOKEN
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://agrit-jnk4.vercel.app').replace(/\/+$/, '')
const webhookUrl = `${siteUrl}/api/telegram/webhook`

console.log('[Telegram Setup] Initializing Telegram configuration...')
console.log(`[Telegram Setup] Site URL: ${siteUrl}`)
console.log(`[Telegram Setup] Webhook URL: ${webhookUrl}`)

if (!token) {
  console.log('[Telegram Setup] TELEGRAM_BOT_TOKEN is not configured. Running in Mock / Dry-Run mode.')
  console.log('[Telegram Setup] Webhook URL would be:', webhookUrl)
  console.log('[Telegram Setup] Default commands would be: /start, /help')
  console.log('[Telegram Setup] Chat menu button would be set to: commands')
  console.log('[Telegram Setup] Setup simulated successfully.')
  process.exit(0)
}

async function run() {
  try {
    // 1. setWebhook
    console.log('[Telegram Setup] Setting webhook with allowed_updates: message, callback_query...')
    const webhookBody = {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    }
    if (webhookSecret) {
      webhookBody.secret_token = webhookSecret
    }

    const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookBody),
    })
    const whData = await whRes.json()
    console.log('[Telegram Setup] setWebhook response:', whData)

    // 2. setMyCommands (default scope)
    console.log('[Telegram Setup] Registering default commands...')
    const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Connect your host account' },
          { command: 'help', description: 'Show available host commands' },
        ],
        scope: { type: 'default' },
      }),
    })
    const cmdData = await cmdRes.json()
    console.log('[Telegram Setup] setMyCommands response:', cmdData)

    // 3. setChatMenuButton
    console.log('[Telegram Setup] Setting chat menu button to "commands"...')
    const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'commands' },
      }),
    })
    const menuData = await menuRes.json()
    console.log('[Telegram Setup] setChatMenuButton response:', menuData)

    console.log('[Telegram Setup] Done! Setup finished successfully.')
  } catch (err) {
    console.error('[Telegram Setup] Error:', err)
    process.exit(1)
  }
}

run()
