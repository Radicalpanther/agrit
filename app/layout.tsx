import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Devanagari } from 'next/font/google'
import { getLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import 'leaflet/dist/leaflet.css'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PwaRegister } from '@/components/PwaRegister'
import { AgriGuide } from '@/components/AgriGuide'

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AgriTrails — Stay closer to the land',
  description: 'Discover authentic farm stays, seasonal harvest traditions, and rural experiences across India.',
}

export const viewport: Viewport = {
  themeColor: '#1e3a2b',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={notoSansDevanagari.variable}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PwaRegister />
          <div className="site-shell">
            <Header />
            {children}
            <Footer />
          </div>
          <AgriGuide />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
