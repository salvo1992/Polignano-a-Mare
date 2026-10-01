// Pure pricing rules. Smoobu supplies the nightly tariff; existing site extras
// remain separate and are never used as a fallback when a tariff is missing.
export class QuoteError extends Error {
  constructor(message: string, public code: string, public status = 503) { super(message) }
}

export function stayDates(checkIn: string, checkOut: string): string[] {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  if (!valid(checkIn) || !valid(checkOut)) throw new QuoteError("Date non valide", "INVALID_DATES", 400)
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000
  if (nights < 1 || nights > 550) throw new QuoteError("Intervallo di soggiorno non valido", "INVALID_DATES", 400)
  return Array.from({ length: nights }, (_, i) => new Date(Date.parse(checkIn) + i * 86400000).toISOString().slice(0, 10))
}

export function nightlyQuote(dates: string[], rates: { date: string; price: number; minLengthOfStay: number; available: number }[]) {
  const byDate = new Map(rates.map(rate => [rate.date, rate]))
  const nightlyRates = dates.map(date => {
    const rate = byDate.get(date)
    if (!rate || !Number.isFinite(rate.price) || rate.price <= 0) {
      throw new QuoteError("Tariffa Smoobu non disponibile per tutte le notti. Riprova tra poco.", "MISSING_RATE")
    }
    return { date, price: Math.round(rate.price * 100) / 100 }
  })
  const cents = nightlyRates.reduce((sum, rate) => sum + Math.round(rate.price * 100), 0)
  const minimumStay = Math.max(1, ...dates.map(date => Number(byDate.get(date)?.minLengthOfStay) || 1))
  return {
    source: "smoobu" as const,
    newPrice: cents / 100,
    nights: dates.length,
    pricePerNight: Math.round(cents / dates.length) / 100,
    basePrice: nightlyRates[0].price,
    nightlyRates,
    minimumStay,
    minimumStayMet: dates.length >= minimumStay,
    available: dates.every(date => Number(byDate.get(date)?.available) > 0),
  }
}

export type PricingContext = "booking-page" | "widget"
export function bookingAmounts(subtotal: number, nights: number, adults: number, children: number, context: PricingContext) {
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || adults + children > 4) {
    throw new QuoteError("Seleziona da 1 a 4 ospiti, con almeno un adulto.", "INVALID_GUESTS", 400)
  }
  // Preserve the two existing booking flows' published extras, not OTA markups.
  const extraAdults = Math.max(0, adults - 2)
  const extraChildren = Math.max(0, children - Math.max(0, 2 - adults))
  const guestSupplement = context === "booking-page" ? nights * (extraAdults * 60 + extraChildren * 48) : 0
  const taxes = context === "widget" ? nights * (adults + children) * 2 : 0
  const serviceFee = context === "widget" ? 10 : 0
  return { subtotal, guestSupplement, taxes, serviceFee, totalAmount: Math.round((subtotal + guestSupplement + taxes + serviceFee) * 100) / 100 }
}
