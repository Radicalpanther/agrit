import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { fetchServerProductsWithFarm } from '@/lib/supabase/queries-server'
import { formatRupees } from '@/lib/money'
import { FarmImage } from '@/components/FarmImage'

export async function ProduceSection() {
  const products = await fetchServerProductsWithFarm()

  return (
    <section className="section produce-section" id="produce" style={{ scrollMarginTop: '85px' }}>
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
        {products.map((item) => {
          const productHref = `/farms/${item.farm.slug}?product=${item.id}#products`

          return (
            <article className="produce-card" key={item.id}>
              <FarmImage src={item.image} alt={item.name} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', letterSpacing: '-0.3px' }}>
                  <Link href={productHref} className="produce-card-link">
                    {item.name}
                  </Link>
                </h3>
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
              <span className="produce-reserve-btn" aria-hidden="true">
                <span>Reserve for pickup</span>
                <ArrowRight size={12} />
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
