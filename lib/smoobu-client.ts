/**
 * Smoobu API Client
 * Centralized client for all Smoobu API interactions
 * Uses single API Key authentication (no refresh needed)
 * 
 * API Documentation: https://docs.smoobu.com
 */

const SMOOBU_API_URL = "https://login.smoobu.com/api"
const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY

// Channel IDs for Smoobu
export const SMOOBU_CHANNELS = {
  DIRECT: 70,           // Direct bookings (manual/website)
  AIRBNB: 1,            // Airbnb
  BOOKING_COM: 2,       // Booking.com
  VRBO: 3,              // Vrbo/HomeAway
  EXPEDIA: 4,           // Expedia
  TRIPADVISOR: 5,       // TripAdvisor
  BLOCKED: 70,          // Use direct channel for blocking
}

export interface SmoobuReservation {
  id: number
  reference_id?: string
  type: string
  arrival: string       // YYYY-MM-DD
  departure: string     // YYYY-MM-DD
  created_at: string
  modifiedAt?: string
  apartment: {
    id: number
    name: string
  }
  channel: {
    id: number
    name: string
  }
  guest_name: string
  firstname?: string
  lastname?: string
  email?: string
  phone?: string
  adults: number
  children: number
  check_in?: string     // HH:MM
  check_out?: string    // HH:MM
  notice?: string
  price?: number
  price_paid?: number
  prepayment?: number
  prepayment_paid?: number
  deposit?: number
  deposit_paid?: number
  language?: string
  guest_app_url?: string
  is_blocked_booking?: boolean
  guestId?: number
  assistant_notice?: string
}

export interface SmoobuApartment {
  id: number
  name: string
  location: {
    street?: string
    postalCode?: string
    city?: string
    country?: {
      id: number
      name: string
    }
  }
  timeZone?: string
  currency?: string
  price?: {
    minimal?: number
    maximal?: number
  }
}

export interface SmoobuReview {
  id: string
  bookingId: string
  roomId: string
  rating: number
  comment: string
  guestName: string
  source: "airbnb" | "booking"
  date: string
  response?: string
}

// Interface compatibile con Beds24 per facilitare la migrazione
export interface SmoobuBooking {
  id: string
  roomId: string
  arrival: string
  departure: string
  numAdult: number
  numChild: number
  firstName: string
  lastName: string
  email: string
  phone: string
  price: number
  status: string
  referer: string
  apiSourceId?: number
  apiSource?: string
  created: string
  modified: string
  notes?: string
}

export class SmoobuClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    if (!SMOOBU_API_KEY) {
      throw new Error("SMOOBU_API_KEY environment variable is required")
    }
    this.baseUrl = SMOOBU_API_URL
    this.apiKey = SMOOBU_API_KEY
  }

  /**
   * Make an authenticated request to Smoobu API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Api-Key": this.apiKey,
        "Cache-Control": "no-cache",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Smoobu] API Error: ${response.status} - ${error}`)
      throw new Error(`Smoobu API Error: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  /**
   * Map Smoobu channel ID to source name
   */
  private getSourceFromChannel(channelId: number): string {
    switch (channelId) {
      case 1: return "airbnb"
      case 2: return "booking"
      case 3: return "vrbo"
      case 4: return "expedia"
      case 70: return "direct"
      default: return "other"
    }
  }

  /**
   * Convert Smoobu reservation to Beds24-compatible format
   * This allows existing code to work with minimal changes
   */
  private convertToLegacyFormat(reservation: SmoobuReservation): SmoobuBooking {
    const nameParts = (reservation.guest_name || "").split(" ")
    const firstName = reservation.firstname || nameParts[0] || ""
    const lastName = reservation.lastname || nameParts.slice(1).join(" ") || ""

    return {
      id: reservation.id.toString(),
      roomId: reservation.apartment?.id?.toString() || "",
      arrival: reservation.arrival,
      departure: reservation.departure,
      numAdult: reservation.adults || 1,
      numChild: reservation.children || 0,
      firstName,
      lastName,
      email: reservation.email || "",
      phone: reservation.phone || "",
      price: reservation.price || 0,
      status: reservation.is_blocked_booking ? "blocked" : "confirmed",
      referer: this.getSourceFromChannel(reservation.channel?.id || 70),
      apiSourceId: reservation.channel?.id,
      apiSource: reservation.channel?.name,
      created: reservation.created_at,
      modified: reservation.modifiedAt || reservation.created_at,
      notes: reservation.notice || reservation.assistant_notice || "",
    }
  }

  /**
   * Fetch all reservations from Smoobu
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   * @param apartmentId - Optional apartment/room ID filter
   */
  async getReservations(from?: string, to?: string, apartmentId?: number): Promise<SmoobuReservation[]> {
    const params = new URLSearchParams()
    
    if (from) params.append("from", from)
    if (to) params.append("to", to)
    if (apartmentId) params.append("apartmentId", apartmentId.toString())
    
    params.append("pageSize", "100")

    const endpoint = `/reservations?${params.toString()}`
    const response = await this.request<{ bookings: SmoobuReservation[] }>(endpoint)
    
    return response.bookings || []
  }

  /**
   * Fetch all bookings (legacy format compatible with Beds24)
   */
  async getBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const reservations = await this.getReservations(from, to)
    return reservations.map(r => this.convertToLegacyFormat(r))
  }

  /**
   * Fetch bookings from Booking.com only
   */
  async getBookingComBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const allBookings = await this.getBookings(from, to)
    const filtered = allBookings.filter(b => b.apiSourceId === SMOOBU_CHANNELS.BOOKING_COM)
    console.log(`[Smoobu] Filtered ${filtered.length} Booking.com bookings from ${allBookings.length} total`)
    return filtered
  }

  /**
   * Fetch bookings from Airbnb only
   */
  async getAirbnbBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const allBookings = await this.getBookings(from, to)
    const filtered = allBookings.filter(b => b.apiSourceId === SMOOBU_CHANNELS.AIRBNB)
    console.log(`[Smoobu] Filtered ${filtered.length} Airbnb bookings from ${allBookings.length} total`)
    return filtered
  }

  /**
   * Fetch a single reservation by ID
   */
  async getReservation(reservationId: number): Promise<SmoobuReservation> {
    const response = await this.request<SmoobuReservation>(`/reservations/${reservationId}`)
    return response
  }

  /**
   * Fetch a single booking by ID (legacy format)
   */
  async getBooking(bookingId: string): Promise<SmoobuBooking> {
    const reservation = await this.getReservation(parseInt(bookingId))
    return this.convertToLegacyFormat(reservation)
  }

  /**
   * Get all apartments/rooms from Smoobu
   */
  async getApartments(): Promise<SmoobuApartment[]> {
    const response = await this.request<{ apartments: SmoobuApartment[] }>("/apartments")
    return response.apartments || []
  }

  /**
   * Get all rooms (alias for getApartments for Beds24 compatibility)
   */
  async getRooms(): Promise<{ id: string; name: string; maxPeople: number; price: number }[]> {
    const apartments = await this.getApartments()
    return apartments.map(apt => ({
      id: apt.id.toString(),
      name: apt.name,
      maxPeople: 4, // Default, Smoobu doesn't provide this directly
      price: apt.price?.minimal || 0,
    }))
  }

  /**
   * Create a new reservation (for direct bookings)
   */
  async createReservation(data: {
    apartmentId: number
    arrival: string
    departure: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    adults?: number
    children?: number
    price?: number
    notice?: string
    channelId?: number
  }): Promise<SmoobuReservation> {
    const payload = {
      arrivalDate: data.arrival,
      departureDate: data.departure,
      apartmentId: data.apartmentId,
      channelId: data.channelId || SMOOBU_CHANNELS.DIRECT,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: data.email || "",
      phone: data.phone || "",
      adults: data.adults || 1,
      children: data.children || 0,
      price: data.price || 0,
      notice: data.notice || "",
    }

    console.log("[Smoobu] Creating reservation:", payload)

    const response = await this.request<{ id: number }>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    console.log("[Smoobu] Reservation created with ID:", response.id)

    // Fetch the created reservation to return full data
    return await this.getReservation(response.id)
  }

  /**
   * Block dates for an apartment (for maintenance or manual blocking)
   */
  async blockDates(apartmentId: string | number, from: string, to: string, reason = "maintenance"): Promise<void> {
    console.log("[Smoobu] Blocking dates:", { apartmentId, from, to, reason })

    try {
      await this.createReservation({
        apartmentId: typeof apartmentId === "string" ? parseInt(apartmentId) : apartmentId,
        arrival: from,
        departure: to,
        firstName: "BLOCKED",
        lastName: reason.toUpperCase(),
        notice: reason,
        channelId: SMOOBU_CHANNELS.BLOCKED,
        adults: 0,
        price: 0,
      })

      console.log("[Smoobu] Successfully blocked dates")
    } catch (error) {
      console.error("[Smoobu] Error blocking dates:", error)
      throw error
    }
  }

  /**
   * Update a reservation
   */
  async updateReservation(reservationId: number, data: Partial<{
    arrivalDate: string
    departureDate: string
    firstName: string
    lastName: string
    email: string
    phone: string
    adults: number
    children: number
    price: number
    notice: string
  }>): Promise<void> {
    await this.request(`/reservations/${reservationId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete/Cancel a reservation
   */
  async deleteReservation(reservationId: number): Promise<void> {
    await this.request(`/reservations/${reservationId}`, {
      method: "DELETE",
    })
  }

  /**
   * Unblock dates (delete the blocking reservation)
   */
  async unblockDates(blockingId: string): Promise<void> {
    console.log("[Smoobu] Unblocking dates, reservation ID:", blockingId)
    await this.deleteReservation(parseInt(blockingId))
    console.log("[Smoobu] Successfully unblocked dates")
  }

  /**
   * Get availability/rates for an apartment
   */
  async getRates(apartmentId: number, from: string, to: string): Promise<any> {
    const params = new URLSearchParams({
      apartments: apartmentId.toString(),
      start_date: from,
      end_date: to,
    })

    const response = await this.request<any>(`/rates?${params.toString()}`)
    return response
  }

  /**
   * Get booking.com reviews (if connected)
   * Note: Smoobu may have limited review API support
   */
  async getBookingComReviews(limit = 50): Promise<SmoobuReview[]> {
    // Smoobu doesn't have a dedicated reviews endpoint like Beds24
    // Reviews are typically synced via the OTA directly
    console.log("[Smoobu] Reviews endpoint not available in Smoobu API")
    return []
  }

  /**
   * Get Airbnb reviews (if connected)
   */
  async getAirbnbReviews(limit = 50): Promise<SmoobuReview[]> {
    console.log("[Smoobu] Reviews endpoint not available in Smoobu API")
    return []
  }

  /**
   * Get all reviews
   */
  async getReviews(): Promise<SmoobuReview[]> {
    // Smoobu doesn't have a reviews API, return empty
    return []
  }

  /**
   * No token refresh needed for Smoobu (uses permanent API key)
   */
  async forceRefreshToken(): Promise<void> {
    console.log("[Smoobu] No token refresh needed - using permanent API key")
  }

  /**
   * No token refresh needed for Smoobu
   */
  async forceRefreshWriteToken(): Promise<void> {
    console.log("[Smoobu] No token refresh needed - using permanent API key")
  }
}

// Export singleton instance
export const smoobuClient = new SmoobuClient()
