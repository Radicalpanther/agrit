import Link from 'next/link'
import { ArrowRight, Sprout } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function PromiseBanner() {
  const t = await getTranslations('home.promise')

  return (
    <section className="promise">
      <div className="promise-icon">
        <Sprout size={24} />
      </div>
      <div>
        <p className="section-kicker">{t('kicker')}</p>
        <h2>{t('heading')}</h2>
        <p>{t('paragraph')}</p>
      </div>
      <Link className="outline-btn" href="/dashboard">
        {t('listFarm')} <ArrowRight size={16} />
      </Link>
    </section>
  )
}
