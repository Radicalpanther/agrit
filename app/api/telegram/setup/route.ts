import { NextResponse } from 'next/server'
import { setWebhook, setMyCommands, setChatMenuButton } from '@/lib/telegram'

export const DEFAULT_COMMANDS = [
  { command: 'start', description: 'Connect your host account' },
  { command: 'help', description: 'Show available host commands' },
]

export async function POST(request: Request) {
  return handleSetup(request)
}

export async function GET(request: Request) {
  return handleSetup(request)
}

async function handleSetup(request: Request) {
  try {
    const url = new URL(request.url)
    const secretParam = url.searchParams.get('secret')
    const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.ADMIN_SECRET
    if (expectedSecret && secretParam !== expectedSecret && authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawSiteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      url.origin
    const siteUrl = rawSiteUrl.replace(/\/+$/, '')
    const webhookUrl = `${siteUrl}/api/telegram/webhook`
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

    // 1. Register Webhook with allowed_updates: message and callback_query
    const webhookRes = await setWebhook(webhookUrl, webhookSecret, ['message', 'callback_query'])

    // 2. Register default commands (scope: default)
    const commandsRes = await setMyCommands(DEFAULT_COMMANDS, { type: 'default' })

    // 3. Set chat menu button to "commands"
    const menuRes = await setChatMenuButton({ type: 'commands' })

    return NextResponse.json({
      success: webhookRes.success && commandsRes.success && menuRes.success,
      webhookUrl,
      webhook: webhookRes,
      defaultCommands: commandsRes,
      menuButton: menuRes,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Setup failed' }, { status: 500 })
  }
}
