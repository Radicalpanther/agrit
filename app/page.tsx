import { getTranslations } from 'next-intl/server'
import { Hero } from '@/components/Hero'
import { SearchBar } from '@/components/SearchBar'
import { FeaturedFarms } from '@/components/FeaturedFarms'
import { ProduceSection } from '@/components/ProduceSection'
import { PromiseBanner } from '@/components/PromiseBanner'
import { HarvestCalendar } from '@/components/HarvestCalendar'

export default async function HomePage() {
  const t = await getTranslations('home.story')
  const headingLines = t('heading').split('\n')

  return (
    <>
      <Hero />
      <SearchBar />

      <section className="section intro-grid" id="story">
        <div>
          <p className="section-kicker">{t('kicker')}</p>
          <h2>
            {headingLines.map((line, idx) => (
              <span key={idx} style={{ display: 'block' }}>
                {line}
              </span>
            ))}
          </h2>
        </div>
        <div className="intro-copy">
          <p>{t('paragraph')}</p>
          <div className="stat-row">
            <div>
              <strong>{t('statDirectPercent')}</strong>
              <span>{t('statDirectLabel')}</span>
            </div>
            <div>
              <strong>{t('statExperiencesCount')}</strong>
              <span>{t('statExperiencesLabel')}</span>
            </div>
            <div>
              <strong>{t('statRatingValue')}</strong>
              <span>{t('statRatingLabel')}</span>
            </div>
          </div>
        </div>
      </section>

      <FeaturedFarms />
      <HarvestCalendar />
      <PromiseBanner />
      <ProduceSection />
    </>
  )
}
