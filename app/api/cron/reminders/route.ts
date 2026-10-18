import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyBookingStatus } from '@/lib/notify'

/**
 * Protected cron route to send pre-arrival reminders to tourists the day before check-in.
 * Scheduled via vercel.json cron: 0 4 * * * (daily at 04:00 UTC / 09:30 AM IST).
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Enforce authorization if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron') === '1'
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
      }
    }

    // Determine target check-in date: Tomorrow (YYYY-MM-DD)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const serviceClient = await createServiceClient()

    // Find all confirmed bookings arriving tomorrow
    const { data: bookings, error } = await serviceClient
      .from('bookings')
      .select('id, farm_id, tourist_id, check_in, status')
      .eq('status', 'confirmed')
      .eq('check_in', tomorrowStr)

    if (error) {
      console.error('[Cron Reminders] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const processedBookings: string[] = []

    for (const b of bookings || []) {
      try {
        await notifyBookingStatus(b.id, 'reminder')
        processedBookings.push(b.id)
      } catch (sendErr) {
        console.error(`[Cron Reminders] Failed to send reminder for booking ${b.id}:`, sendErr)
      }
    }

    return NextResponse.json({
      success: true,
      targetDate: tomorrowStr,
      found: bookings?.length || 0,
      remindersSent: processedBookings.length,
      bookingIds: processedBookings,
    })
  } catch (err: any) {
    console.error('[Cron Reminders] Unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
