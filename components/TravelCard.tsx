'use client'

import dynamic from 'next/dynamic'
import type { TripMapProps } from '@/components/TripMap'

const TripMapDynamic = dynamic(
  () => import('@/components/TripMap').then((m) => m.TripMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '280px',
          background: '#f4f6f2',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--muted)',
          fontSize: '12px',
        }}
      >
        Loading map...
      </div>
    ),
  },
)

export type TravelCardProps = TripMapProps

export function TravelCard(props: TravelCardProps) {
  return <TripMapDynamic {...props} />
}
