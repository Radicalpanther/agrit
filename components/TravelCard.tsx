'use client'

import { TripMap, type TripMapProps } from '@/components/TripMap'

export type TravelCardProps = TripMapProps

export function TravelCard(props: TravelCardProps) {
  return <TripMap {...props} />
}
