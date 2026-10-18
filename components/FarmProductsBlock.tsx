'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Minus, Plus, ShoppingBag } from 'lucide-react'
import { formatRupees } from '@/lib/money'
import { createClient } from '@/lib/supabase/client'

export interface FarmProductItem {
  id: string
  name: string
  unit: string
  detail?: string
  price_paise: number
  stock?: number
  [key: string]: any
}

interface FarmProductsBlockProps {
  farmSlug: string
  farmId: string
  farmName: string
  products: FarmProductItem[]
}

export function FarmProductsBlock({
  farmSlug,
  farmId,
  farmName,
  products,
}: FarmProductsBlockProps) {
  const router = useRouter()

  const [openReserveId, setOpenReserveId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [reserving, setReserving] = useState(false)
  const [confirmedId, setConfirmedId] = useState<string | null>(null)

  const getQty = (id: string) => quantities[id] || 1

  const changeQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 1
      const next = Math.max(1, Math.min(20, current + delta))
      return { ...prev, [id]: next }
    })
  }

  // Handle Reserve click with auth check
  const handleReserveClick = async (prod: FarmProductItem) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const currentUrl = `/farms/${farmSlug}`
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    setOpenReserveId((prev) => (prev === prod.id ? null : prod.id))
  }

  // Handle reservation confirmation
  const handleConfirmReservation = async (prod: FarmProductItem) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const currentUrl = `/farms/${farmSlug}`
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    setReserving(true)
    try {
      const qty = getQty(prod.id)
      if (farmId) {
        await supabase.from('product_reservations').insert({
          product_id: prod.id,
          tourist_id: user.id,
          pickup_farm_id: farmId,
          qty,
          status: 'reserved',
        })
      }
      setConfirmedId(prod.id)
    } catch (err) {
      console.error('[FarmProductsBlock] Reservation error:', err)
    } finally {
      setReserving(false)
    }
  }

  if (!products || products.length === 0) {
    return null
  }

  return (
    <div
      id="products"
      style={{
        marginTop: '36px',
        borderTop: '1px solid var(--line)',
        paddingTop: '24px',
        scrollMarginTop: '90px',
      }}
    >
      <p className="section-kicker">Reserve and collect at the farm</p>
      <h2
        style={{
          fontSize: '20px',
          letterSpacing: '-0.5px',
          margin: '4px 0 6px',
          color: 'var(--ink)',
        }}
      >
        Products from this farm
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
        Reserve fresh harvests to collect at the farm. Pay directly to the host family upon arrival.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {products.map((prod) => {
          const isOpen = openReserveId === prod.id
          const isConfirmed = confirmedId === prod.id
          const currentQty = getQty(prod.id)

          return (
            <div
              key={prod.id}
              style={{
                border: '1px solid var(--line)',
                background: '#ffffff',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Product Top Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: 'var(--ink)',
                      }}
                    >
                      {prod.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    {prod.unit} {prod.detail ? `· ${prod.detail}` : ''}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13.5px',
                    color: 'var(--forest)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatRupees(prod.price_paise)}
                </div>
              </div>

              {/* Action Button: Reserve Toggle */}
              {!isConfirmed && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleReserveClick(prod)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      background: isOpen ? 'var(--forest)' : 'var(--mint)',
                      color: isOpen ? '#ffffff' : 'var(--forest)',
                      border: '1px solid #c2d6be',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ShoppingBag size={12} />
                    <span>{isOpen ? 'Close reserve' : 'Reserve for pickup'}</span>
                  </button>
                </div>
              )}

              {/* Active Reserve Option Flow */}
              {isOpen && !isConfirmed && (
                <div
                  style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: '10px',
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                      Quantity
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => changeQty(prod.id, -1)}
                        disabled={currentQty <= 1}
                        style={{
                          width: '24px',
                          height: '24px',
                          display: 'grid',
                          placeItems: 'center',
                          border: '1px solid var(--line)',
                          background: '#ffffff',
                          cursor: currentQty <= 1 ? 'not-allowed' : 'pointer',
                          color: 'var(--ink)',
                          fontSize: '12px',
                        }}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={11} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                        {currentQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(prod.id, 1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          display: 'grid',
                          placeItems: 'center',
                          border: '1px solid var(--line)',
                          background: '#ffffff',
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontSize: '12px',
                        }}
                        aria-label="Increase quantity"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f1f5ee',
                      padding: '6px 10px',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>Total pickup price</span>
                    <strong style={{ color: 'var(--ink)', fontSize: '12.5px' }}>
                      {formatRupees(prod.price_paise * currentQty)}
                    </strong>
                  </div>

                  <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.4 }}>
                    Pay directly to host {farmName} upon arrival. No upfront online charge.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleConfirmReservation(prod)}
                    disabled={reserving}
                    style={{
                      background: 'var(--forest)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: reserving ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {reserving ? (
                      <span>Reserving...</span>
                    ) : (
                      <>
                        <span>Confirm reservation ({currentQty} {prod.unit})</span>
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Confirmed State */}
              {isConfirmed && (
                <div
                  style={{
                    background: 'var(--mint)',
                    border: '1px solid #c2d6be',
                    padding: '10px',
                    fontSize: '11px',
                    color: 'var(--forest)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                    <Check size={14} />
                    <span>Reserved for pickup!</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#3d5e4b' }}>
                    {currentQty}x {prod.name} reserved. You can collect and pay upon arrival at {farmName}.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <Link
                      href="/dashboard?view=tourist"
                      style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      View in dashboard &rarr;
                    </Link>
                    <Link
                      href={`/book/${farmSlug}`}
                      style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Book a stay &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
