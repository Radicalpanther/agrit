export function formatRupees(paise: number, locale = 'en'): string {
  const rupees = Math.round(paise / 100)
  const localeTag = locale === 'mr' ? 'mr-IN' : locale === 'hi' ? 'hi-IN' : 'en-IN'
  return new Intl.NumberFormat(localeTag, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees)
}
