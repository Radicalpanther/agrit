import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Clock3,
  Leaf,
  MapPin,
  ShoppingBag,
  Star,
  Sun,
  Users,
} from 'lucide-react'
import { getAllFarms } from '@/lib/mock-data'
import { fetchServerFarmBySlug, fetchNearbyFarmProducts } from '@/lib/supabase/queries-server'
import { formatRupees } from '@/lib/money'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { EcoScore } from '@/components/EcoScore'
import { FarmReviews } from '@/components/FarmReviews'
import { FarmImage } from '@/components/FarmImage'
import { FarmProductsBlock } from '@/components/FarmProductsBlock'
import { FarmDayFlow } from '@/components/FarmDayFlow'

export function generateStaticParams() {
  return getAllFarms().map((farm) => ({
    slug: farm.slug,
  }))
}

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const farm = await fetchServerFarmBySlug(slug)

  if (!farm) {
    notFound()
  }

  const raw = farm.raw || {}
  const activities: any[] = farm.activities || []
  const products: any[] = farm.products || []
  const reviews: any[] = farm.reviewList || []

  const nearbyProducts = await fetchNearbyFarmProducts(
    farm.id,
    Number(raw.lat || farm.lat || 17.0016),
    Number(raw.lng || farm.lng || 73.312),
    15,
  )

  const stayOverviewCard = (
    <div className="booking-form" style={{ marginTop: '28px' }}>
      <div className="form-header">
        <div>
          <p className="section-kicker">Experience the land</p>
          <h2 style={{ fontSize: '20px', margin: '4px 0 0' }}>Stay overview</h2>
        </div>
        <span>
          <strong>{formatRupees(farm.pricePaise)}</strong> / guest
        </span>
      </div>

      <div
        style={{
          border: '1px solid var(--line)',
          background: '#ffffff',
          padding: '14px 16px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
            Hosted by {raw.host_name || farm.hostName || 'the farming family'}
          </div>
          {farm.verified && <VerifiedBadge size="sm" />}
        </div>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '12px',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Bookings are hosted directly by {raw.host_name || farm.hostName || 'the farming family'}. Accommodation includes traditional meals, seasonal harvests, and authentic rural hospitality.
        </p>
      </div>

      {raw.allows_day_visit && raw.day_visit_price_paise && (
        <div
          style={{
            border: '1px solid var(--line)',
            background: 'var(--mint)',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--forest)', marginBottom: '4px' }}>
            Day visits also available
          </div>
          <div style={{ color: 'var(--muted)' }}>
            {formatRupees(raw.day_visit_price_paise)} / guest ({raw.day_visit_start?.slice(0, 5)} to {raw.day_visit_end?.slice(0, 5)})
          </div>
        </div>
      )}

      <Link
        className="primary-btn submit-btn"
        href={`/book/${farm.slug}`}
        style={{ textDecoration: 'none' }}
      >
        Continue to reservation <ArrowRight size={17} />
      </Link>

      <p className="form-note">
        No payment today · Free cancellation up to 48 hours before arrival
      </p>
    </div>
  )

  const farmDetailsContent = (
    <div>
      <div className="booking-photo">
        <FarmImage src={farm.image} alt={farm.name} />
      </div>

      <div className="booking-copy">
        <p className="section-kicker">Your rural reset</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <h1 style={{ margin: 0 }}>{farm.name}</h1>
          {farm.verified && <VerifiedBadge size="md" />}
        </div>
        <p className="muted">
          <MapPin size={14} /> {farm.place} ·{' '}
          <Star size={14} fill="currentColor" /> {farm.rating} (
          {farm.reviews} reviews)
        </p>
        <p>{farm.description}</p>

        <div className="amenities">
          <span>
            <Leaf size={16} /> Organic meals
          </span>
          <span>
            <Users size={16} /> Sleeps {farm.sleeps}
          </span>
          <span>
            <Clock3 size={16} /> Flexible check-in
          </span>
          {raw.allows_day_visit && (
            <span>
              <Sun size={16} /> Day visits allowed
            </span>
          )}
        </div>

        <EcoScore
          guests={2}
          nights={1}
          organicPct={raw.organic_pct ?? farm.organicPct ?? 85}
        />

        {activities.length > 0 && (
          <div style={{ marginTop: '36px', borderTop: '1px solid var(--line)', paddingTop: '28px' }}>
            <FarmDayFlow farm={farm} activities={activities} />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section className="booking-page">
      <Link className="back-link" href="/explore">
        &larr; Back to farm stays
      </Link>

      <div className="booking-layout">
        <div>{farmDetailsContent}</div>
        <div>{stayOverviewCard}</div>
      </div>

      {/* Products from this farm */}
      {products.length > 0 && (
        <Suspense
          fallback={
            <div id="products" style={{ marginTop: '36px', scrollMarginTop: '90px', color: 'var(--muted)', fontSize: '12px' }}>
              Loading farm products...
            </div>
          }
        >
          <FarmProductsBlock
            farmSlug={farm.slug}
            farmId={farm.id}
            farmName={farm.name}
            products={products}
          />
        </Suspense>
      )}

      {/* Nearby farms block within 15 km */}
      {nearbyProducts.length > 0 && (
        <div style={{ marginTop: '36px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
          <p className="section-kicker">Within 15 km</p>
          <h2 style={{ fontSize: '20px', letterSpacing: '-0.5px', margin: '4px 0 6px', color: 'var(--ink)' }}>
            Products from neighbouring farms
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
            Explore produce from nearby growers in the valley. Reserve and collect at the farm.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {nearbyProducts.map((prod) => (
              <Link
                key={prod.id}
                href={`/farms/${prod.farm.slug}`}
                className="nearby-prod-link"
                style={{
                  border: '1px solid var(--line)',
                  background: '#ffffff',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                    {prod.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {prod.unit} · {prod.farm.name} ({prod.farm.distanceKm} km away)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--forest)' }}>
                    {formatRupees(prod.pricePaise)}
                  </div>
                  <span
                    style={{
                      background: 'var(--mint)',
                      color: 'var(--forest)',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '2px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Reserve &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div style={{ marginTop: '36px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
        <FarmReviews
          farmId={farm.id}
          farmSlug={farm.slug}
          farmName={farm.name}
          initialRatingAvg={farm.rating}
          initialReviewCount={farm.reviews}
          initialReviews={reviews}
        />
      </div>
    </section>
  )
}
