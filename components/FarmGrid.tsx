import type { Farm } from '@/lib/mock-data'
import { FarmCard } from './FarmCard'

export interface FarmGridProps {
  farms: Farm[]
  alternateTags?: boolean
}

export function FarmGrid({ farms, alternateTags = false }: FarmGridProps) {
  return (
    <div className="farm-grid">
      {farms.map((farm, index) => (
        <FarmCard
          key={`${farm.slug}-${index}`}
          farm={farm}
          tagOverride={alternateTags ? (index % 2 === 1 ? 'Seasonal' : 'Top rated') : undefined}
        />
      ))}
    </div>
  )
}
