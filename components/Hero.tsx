import Link from 'next/link'
import { ArrowRight, CircleHelp } from 'lucide-react'

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-image" />
      <div className="hero-content">
        <h1>
          Come for the <em>land.</em>
          <br />
          Stay for the stories.
        </h1>
        <p>
          Discover working farms, seasonal traditions and warm village stays—directly from the
          people who call rural Maharashtra home.
        </p>
        <div className="hero-ctas">
          <Link className="primary-btn" href="/explore">
            Explore farm stays <ArrowRight size={17} />
          </Link>
          <Link className="text-btn" href="/#story">
            How AgriTrails works <CircleHelp size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
