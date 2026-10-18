import Link from 'next/link'
import { ArrowRight, CircleHelp } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function Hero() {
  const t = await getTranslations('home.hero')
  const headlineLines = t('headline').split('\n')

  return (
    <section className="hero">
      <div className="hero-image" />
      <div className="hero-content">
        <h1>
          {headlineLines.map((line, idx) => (
            <span key={idx} style={{ display: 'block' }}>
              {line}
            </span>
          ))}
        </h1>
        <p>{t('subhead')}</p>
        <div className="hero-ctas">
          <Link className="primary-btn" href="/explore">
            {t('exploreStays')} <ArrowRight size={17} />
          </Link>
          <Link className="text-btn" href="/#story">
            {t('howItWorks')} <CircleHelp size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
