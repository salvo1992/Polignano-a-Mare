import "server-only"
import { smoobuClient } from "@/lib/smoobu-client"
import { nightlyQuote, QuoteError, stayDates } from "@/lib/stay-quote"

export async function getSmoobuQuote(roomId: string, checkIn: string, checkOut: string) {
  const dates = stayDates(checkIn, checkOut)
  const apartmentId = await smoobuClient.resolveApartmentId(roomId)
  if (!apartmentId) throw new QuoteError("Camera non associata a Smoobu", "ROOM_NOT_MAPPED")
  const rates = await smoobuClient.getRates(String(apartmentId), dates[0], dates[dates.length - 1])
  return { ...nightlyQuote(dates, rates), apartmentId }
}
