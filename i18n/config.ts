export const defaultLocale = 'en' as const

export const locales = ['en', 'hi', 'mr'] as const
export type Locale = (typeof locales)[number]

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
}
