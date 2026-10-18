import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  const farm = await fetchServerFarmBySlug(slug)

  if (!farm) {
    notFound()
  }

  const produce = await fetchServerProduce()

  return (
    <section className="booking-page">
      <Link className="back-link" href={`/farms/${farm.slug}`}>
        &larr; Back to farm stays
      </Link>

      <BookingForm farm={farm} produce={produce} />
    </section>
  )
}
