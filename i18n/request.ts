import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()

  // 1. Read locale from NEXT_LOCALE cookie
  let locale: Locale = defaultLocale
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined

  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale
  } else {
    // 2. Fall back to Accept-Language header
    const acceptLanguage = headerStore.get('accept-language') || ''
    const preferred = acceptLanguage
      .split(',')
      .map((part) => part.split(';')[0].trim().toLowerCase())
      .find((lang) => {
        const base = lang.split('-')[0] as Locale
        return locales.includes(base)
      })

    if (preferred) {
      const base = preferred.split('-')[0] as Locale
      if (locales.includes(base)) {
        locale = base
      }
    }
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
