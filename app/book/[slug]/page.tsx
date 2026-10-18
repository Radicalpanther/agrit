import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAllFarms } from '@/lib/mock-data'
import { fetchServerFarmBySlug, fetchServerProduce } from '@/lib/supabase/queries-server'
import { BookingForm } from '@/components/BookingForm'

export function generateStaticParams() {
  return getAllFarms().map((farm) => ({
    slug: farm.slug,
  }))
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const t = await getTranslations('booking')
  const farm = await fetchServerFarmBySlug(slug)

  if (!farm) {
    notFound()
  }

  const produce = await fetchServerProduce()

  return (
    <section className="booking-page min-w-0 w-full overflow-hidden">
      <div className="mb-4 sm:mb-6">
        <Link
          className="back-link min-h-[44px] inline-flex items-center gap-1 text-xs font-bold text-[var(--forest)]"
          href={`/farms/${farm.slug}`}
        >
          {t('backToFarm')}
        </Link>
      </div>

      <BookingForm farm={farm} produce={produce} />
    </section>
  )
}
