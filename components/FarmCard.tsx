import Link from 'next/link'
import { ArrowRight, Heart, MapPin, Star } from 'lucide-react'
import type { Farm } from '@/lib/mock-data'
import { formatRupees } from '@/lib/money'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { FarmImage } from '@/components/FarmImage'

export interface FarmCardProps {
  farm: Farm
  tagOverride?: string
}

export function FarmCard({ farm, tagOverride }: FarmCardProps) {
  return (
    <article className="farm-card">
      <div className="farm-image">
        <FarmImage src={farm.image} alt={farm.name} />
        <span className="image-tag">{tagOverride || farm.tag}</span>
        <button className="heart-btn" aria-label={`Save ${farm.name}`} type="button">
          <Heart size={17} />
        </button>
      </div>
      <div className="farm-body">
        <div className="farm-title">
          <h3>{farm.name}</h3>
          <span>
            <Star size={14} fill="currentColor" /> {farm.rating}
          </span>
        </div>
        <p className="muted">
          <MapPin size={14} /> {farm.place}
        </p>
        {farm.verified && (
          <div style={{ marginTop: '7px', marginBottom: '2px' }}>
            <VerifiedBadge size="sm" />
          </div>
        )}
        <p className="farm-type">{farm.type}</p>
        <div className="farm-price">
          <span>
            <strong>{formatRupees(farm.pricePaise)}</strong> / guest
          </span>
          <Link href={`/farms/${farm.slug}`}>
            View stay <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  )
}
