import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

import { PwaRegister } from '@/components/PwaRegister'
import { AgriGuide } from '@/components/AgriGuide'

export const metadata: Metadata = {
  title: 'AgriTrails — Stay closer to the land',
  description: 'Discover farm stays, seasonal traditions and rural experiences across Maharashtra.',
}

export const viewport: Viewport = {
  themeColor: '#1e3a2b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PwaRegister />
        <div className="site-shell">
          <Header />
          {children}
          <Footer />
        </div>
        <AgriGuide />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
