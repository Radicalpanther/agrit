import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { fetchServerProductsWithFarm } from '@/lib/supabase/queries-server'
import { formatRupees } from '@/lib/money'
import { FarmImage } from '@/components/FarmImage'

export async function ProduceSection() {
  const products = await fetchServerProductsWithFarm()

  return (
    <section className="section produce-section" id="produce">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Reserve and collect at the farm</p>
          <h2>
            Farm-fresh produce,
            <br />
            waiting for your arrival.
          </h2>
        </div>
        <p className="heading-note">
          Reserve authentic artisanal products and seasonal harvests to collect at the farm. Pay directly to your host upon arrival.
        </p>
      </div>

      <div className="produce-grid">
        {products.map((item) => (
          <article className="produce-card" key={item.id}>
            <FarmImage src={item.image} alt={item.name} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', letterSpacing: '-0.3px' }}>{item.name}</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>{item.detail}</p>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--forest)',
                  marginTop: '2px',
                }}
              >
                Sold by {item.farm.name}
              </span>
              <strong style={{ fontSize: '13px', marginTop: '4px' }}>
                {formatRupees(item.pricePaise)}
              </strong>
            </div>
            <Link
              href={`/farms/${item.farm.slug}#products`}
              aria-label={`Reserve ${item.name} for pickup at ${item.farm.name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 10px',
                background: 'var(--mint)',
                border: '1px solid #c2d6be',
                borderRadius: '2px',
                color: 'var(--forest)',
                fontSize: '11px',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                alignSelf: 'center',
              }}
            >
              <span>Reserve for pickup</span>
              <ArrowRight size={12} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
