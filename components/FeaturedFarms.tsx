import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { fetchServerFarms } from '@/lib/supabase/queries-server'
import { FarmGrid } from './FarmGrid'

export async function FeaturedFarms() {
  const farms = await fetchServerFarms()

  return (
    <section className="section" id="farms">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Handpicked by us</p>
          <h2>
            Find your kind of
            <br />
            weekend.
          </h2>
        </div>
        <Link className="text-btn" href="/explore">
          View all farm stays <ArrowRight size={16} />
        </Link>
      </div>
      <FarmGrid farms={farms.slice(0, 3)} />
    </section>
  )
}
