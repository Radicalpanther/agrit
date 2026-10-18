import Link from 'next/link'
import { ArrowRight, Sprout } from 'lucide-react'

export function PromiseBanner() {
  return (
    <section className="promise">
      <div className="promise-icon">
        <Sprout size={24} />
      </div>
      <div>
        <p className="section-kicker">A fairer way forward</p>
        <h2>Every booking helps a farm thrive.</h2>
        <p>
          We keep it simple: no commissions hidden from farmers, no mass-produced experiences.
          Just a direct connection and a little more good in the world.
        </p>
      </div>
      <Link className="outline-btn" href="/dashboard">
        List your farm <ArrowRight size={16} />
      </Link>
    </section>
  )
}
