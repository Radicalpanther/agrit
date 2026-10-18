import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function Footer() {
  const t = await getTranslations('common')

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
        <p>{t('brandTagline')}</p>
      </div>
      <div className="footer-links">
        <span>{t('copyright')}</span>
        <Link href="/#story">{t('ourMission')}</Link>
        <Link href="/#story">{t('helpCentre')}</Link>
        <Link href="/#story">{t('privacy')}</Link>
      </div>
    </footer>
  )
}
