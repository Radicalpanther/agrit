import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { fetchServerProductsWithFarm, type ProductWithFarm } from '@/lib/supabase/queries-server'
import { formatRupees } from '@/lib/money'

export function getProductCategory(name: string): string {
  const lower = name.toLowerCase()
  if (/mango|apple|fruit/.test(lower)) return 'Fruit'
  if (/saffron|pepper|spice|cardamom/.test(lower)) return 'Spice'
  if (/ghee|milk|paneer|curd/.test(lower)) return 'Dairy'
  if (/tea|coffee/.test(lower)) return 'Tea'
  if (/rice|jowar|flour|wheat/.test(lower)) return 'Grain'
  if (/jaggery|honey/.test(lower)) return 'Sweet'
  return 'Farm produce'
}

export function hasRealImage(url?: string | null): boolean {
  if (!url || !url.trim()) return false
  if (url.includes('photo-1553279768-865429fa0078')) return false // default watermelon photo
  if (url.includes('placeholder')) return false
  return true
}

export function getPlateColors(category: string, idx: number) {
  // Furrow line texture: fine linear tilled field lines
  const furrow = `repeating-linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0px,
    rgba(255, 255, 255, 0.08) 2px,
    transparent 2px,
    transparent 8px
  )`

  // Palette tones: --forest (#17392d), --leaf (#3b6946), --gold (#b37d2e), --mint (#385f4c)
  const colorMap: Record<string, { bg: string; text: string; badgeBg: string }> = {
    Fruit: { bg: '#b37d2e', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
    Spice: { bg: '#2b4f3b', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
    Dairy: { bg: '#385f4c', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
    Tea: { bg: '#17392d', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
    Grain: { bg: '#946727', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
    Sweet: { bg: '#a87428', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
    'Farm produce': { bg: '#335c40', text: '#ffffff', badgeBg: 'rgba(0, 0, 0, 0.22)' },
  }

  const base = colorMap[category] || colorMap['Farm produce']
  return {
    bg: base.bg,
    textColor: base.text,
    badgeBg: base.badgeBg,
    furrow,
  }
}

function selectThreeDistinctFarmProducts(products: ProductWithFarm[]): ProductWithFarm[] {
  const chosen: ProductWithFarm[] = []
  const seenFarms = new Set<string>()

  // 1. Featured products from distinct farms
  for (const p of products) {
    if ((p as any).featured && !seenFarms.has(p.farm.slug)) {
      seenFarms.add(p.farm.slug)
      chosen.push(p)
      if (chosen.length === 3) return chosen
    }
  }

  // 2. Normal products from distinct farms
  for (const p of products) {
    if (!seenFarms.has(p.farm.slug)) {
      seenFarms.add(p.farm.slug)
      chosen.push(p)
      if (chosen.length === 3) return chosen
    }
  }

  // 3. Fallback fill if fewer than 3 unique farms exist
  for (const p of products) {
    if (!chosen.some((c) => c.id === p.id)) {
      chosen.push(p)
      if (chosen.length === 3) return chosen
    }
  }

  return chosen
}

export async function ProduceSection() {
  const allProducts = await fetchServerProductsWithFarm(20)
  const products = selectThreeDistinctFarmProducts(allProducts)

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

      <div className="produce-grid-vertical">
        {products.map((item, idx) => {
          const category = getProductCategory(item.name)
          const plate = getPlateColors(category, idx)
          const farmHref = `/farms/${item.farm.slug}`
          const hasRealImg = hasRealImage(item.image)

          return (
            <article className="produce-card-vertical" key={item.id}>
              {/* 150px Top: Real image or colour plate with furrow lines */}
              <div
                style={{
                  height: '150px',
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: plate.bg,
                  backgroundImage: hasRealImg ? undefined : plate.furrow,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '14px',
                  boxSizing: 'border-box',
                }}
              >
                {hasRealImg ? (
                  <>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <span
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        alignSelf: 'flex-start',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        color: '#ffffff',
                        background: 'rgba(23, 57, 45, 0.85)',
                        padding: '3px 8px',
                        borderRadius: 0,
                      }}
                    >
                      {category}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        color: plate.textColor,
                        background: plate.badgeBg,
                        padding: '3px 8px',
                        borderRadius: 0,
                        alignSelf: 'flex-start',
                      }}
                    >
                      {category}
                    </span>
                    <div
                      style={{
                        fontSize: '10.5px',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        color: plate.textColor,
                        opacity: 0.85,
                        fontWeight: 600,
                      }}
                    >
                      Direct farm harvest
                    </div>
                  </>
                )}
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: '6px',
                  background: '#ffffff',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    letterSpacing: '-0.3px',
                    color: 'var(--ink)',
                    fontWeight: 700,
                  }}
                >
                  <Link href={farmHref} className="produce-card-link">
                    {item.name}
                  </Link>
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.unit ? `${item.unit} · ` : ''}{item.detail}
                </p>

                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: 'var(--forest)',
                    fontWeight: 600,
                  }}
                >
                  From {item.farm.name}, {item.farm.place}
                </p>

                {/* Footer: Price on left, "View farm" text button on right */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>
                    {formatRupees(item.pricePaise)}
                  </strong>
                  <span
                    className="text-btn"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--forest)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    View farm <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
