import Link from 'next/link'
import { Leaf } from 'lucide-react'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Leaf size={17} fill="currentColor" />
          </span>
          <span>
            agri<span>trails</span>
          </span>
        </Link>
        <p>Good stays. Better livelihoods.</p>
      </div>
      <div className="footer-links">
        <span>© 2025 AgriTrails</span>
        <Link href="/#story">Our mission</Link>
        <Link href="/#story">Help centre</Link>
        <Link href="/#story">Privacy</Link>
      </div>
    </footer>
  )
}
