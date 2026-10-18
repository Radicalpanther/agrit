import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  const baseConfig = {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    images: {
      unoptimized: true,
    },
    env: {
      NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Agritrail_bot',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://agrit-jnk4.vercel.app',
      NOTIFY_CHANNEL: process.env.NOTIFY_CHANNEL || 'telegram',
    },
  }

  return withNextIntl(baseConfig)
}
