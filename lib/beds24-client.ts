/**
 * Beds24 API Client V2
 * Centralized client for all Beds24 API interactions
 * Handles dual-token system:
 * - Read Token: Long-term token (~2 months) for GET operations
 * - Refresh Token: Generates short-term tokens for POST/PUT/DELETE operations
 */

import { getFirestore } from "firebase-admin/firestore"
import { admin } from "./firebase-admin"

const BEDS24_API_URL = "https://beds24.com/api/v2"
const BEDS24_READ_TOKEN = process.env.BEDS24_READ_TOKEN
const BEDS24_REFRESH_TOKEN = process.env.BEDS24_REFRESH_TOKEN

interface TokenData {
  accessToken: string
  expiresAt: number // Unix timestamp
  refreshToken: string
}

interface WriteTokenData {
  accessToken: string
  expiresAt: number // Unix timestamp
}

export interface Beds24Booking {
  id: string
  roomId: string
  arrival: string // YYYY-MM-DD
  departure: string // YYYY-MM-DD
  numAdult: number
  numChild: number
  firstName: string
  lastName: string
  email: string
  phone: string
  price: number
  status: string
  referer: string // 'airbnb' | 'booking' | 'direct'
  created: string
  modified: string
  notes?: string
}

export interface Beds24Review {
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

export interface Beds24Room {
  id: string
  name: string
  maxPeople: number
  price: number
}

class Beds24Client {
  private baseUrl: string
  private tokenData: TokenData | null = null
  private writeTokenData: WriteTokenData | null = null
  private refreshPromise: Promise<void> | null = null

  constructor() {
    if (!BEDS24_READ_TOKEN) {
      throw new Error("BEDS24_READ_TOKEN environment variable is required")
    }
    if (!BEDS24_REFRESH_TOKEN) {
      throw new Error("BEDS24_REFRESH_TOKEN environment variable is required")
    }
    this.baseUrl = BEDS24_API_URL
  }

  /**
   * Get stored token data from Firebase
   */
  private async getStoredToken(): Promise<TokenData | null> {
    try {
      const db = getFirestore(admin)
      const tokenDoc = await db.collection("system").doc("beds24_token").get()

      if (!tokenDoc.exists) {
        return null
      }

      const data = tokenDoc.data() as TokenData
      return data
    } catch (error) {
      console.error("[v0] Error getting stored token:", error)
      return null
    }
  }

  /**
   * Store token data in Firebase
   */
  private async storeToken(tokenData: TokenData): Promise<void> {
    try {
      const db = getFirestore(admin)
      await db.collection("system").doc("beds24_token").set(tokenData)
      this.tokenData = tokenData
    } catch (error) {
      console.error("[v0] Error storing token:", error)
      throw error
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        console.log("[v0] Refreshing Beds24 access token...")

        const response = await fetch(`${this.baseUrl}/authentication/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            refreshToken: BEDS24_REFRESH_TOKEN!,
          },
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Token refresh failed: ${response.status} - ${error}`)
        }

        const data = await response.json()

        // Calculate expiration time (subtract 5 minutes for safety margin)
        const expiresAt = Date.now() + (data.expiresIn - 300) * 1000

        const tokenData: TokenData = {
          accessToken: data.token,
          expiresAt,
          refreshToken: BEDS24_REFRESH_TOKEN!,
        }

        await this.storeToken(tokenData)
        console.log("[v0] Access token refreshed successfully")
      } catch (error) {
        console.error("[v0] Error refreshing token:", error)
        throw error
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Get a valid access token (refresh if needed)
   */
  private async getAccessToken(): Promise<string> {
    // Try to get cached token first
    if (!this.tokenData) {
      this.tokenData = await this.getStoredToken()
    }

    // Check if token exists and is still valid
    if (this.tokenData && this.tokenData.expiresAt > Date.now()) {
      return this.tokenData.accessToken
    }

    // Token expired or doesn't exist, refresh it
    await this.refreshAccessToken()

    if (!this.tokenData) {
      throw new Error("Failed to obtain access token")
    }

    return this.tokenData.accessToken
  }

  /**
   * Get stored write token data from Firebase
   */
  private async getStoredWriteToken(): Promise<WriteTokenData | null> {
    try {
      const db = getFirestore(admin)
      const tokenDoc = await db.collection("system").doc("beds24_write_token").get()

      if (!tokenDoc.exists) {
        return null
      }

      const data = tokenDoc.data() as WriteTokenData
      return data
    } catch (error) {
      console.error("[v0] Error getting stored write token:", error)
      return null
    }
  }

  /**
   * Store write token data in Firebase
   */
  private async storeWriteToken(tokenData: WriteTokenData): Promise<void> {
    try {
      const db = getFirestore(admin)
      await db.collection("system").doc("beds24_write_token").set(tokenData)
      this.writeTokenData = tokenData
    } catch (error) {
      console.error("[v0] Error storing write token:", error)
      throw error
    }
  }

  /**
   * Refresh the write access token using the refresh token
   */
  private async refreshWriteToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        console.log("[v0] Refreshing Beds24 write access token...")

        const response = await fetch(`${this.baseUrl}/authentication/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            refreshToken: BEDS24_REFRESH_TOKEN!,
          },
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Write token refresh failed: ${response.status} - ${error}`)
        }

        const data = await response.json()

        // Calculate expiration time (subtract 5 minutes for safety margin)
        const expiresAt = Date.now() + (data.expiresIn - 300) * 1000

        const tokenData: WriteTokenData = {
          accessToken: data.token,
          expiresAt,
        }

        await this.storeWriteToken(tokenData)
        console.log("[v0] Write access token refreshed successfully")
      } catch (error) {
        console.error("[v0] Error refreshing write token:", error)
        throw error
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Get a valid write access token (refresh if needed)
   */
  private async getWriteToken(): Promise<string> {
    // Try to get cached token first
    if (!this.writeTokenData) {
      this.writeTokenData = await this.getStoredWriteToken()
    }

    // Check if token exists and is still valid
    if (this.writeTokenData && this.writeTokenData.expiresAt > Date.now()) {
      return this.writeTokenData.accessToken
    }

    // Token expired or doesn't exist, refresh it
    await this.refreshWriteToken()

    if (!this.writeTokenData) {
      throw new Error("Failed to obtain write access token")
    }

    return this.writeTokenData.accessToken
  }

  /**
   * Make an authenticated request to Beds24 API
   * Uses read token for GET requests, write token for other methods
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || "GET"

    const isReadOperation = method === "GET"
    let token: string

    if (isReadOperation) {
      // Use long-term read token for GET operations
      token = BEDS24_READ_TOKEN!
    } else {
      // Use refresh token system for write operations
      token = await this.getWriteToken()
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        token,
        ...options.headers,
      },
    })

    // If write token is invalid, try refreshing once
    if (response.status === 401 && !isReadOperation) {
      console.log("[v0] Write access token invalid, refreshing...")
      await this.refreshWriteToken()

      const newWriteToken = await this.getWriteToken()
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          token: newWriteToken,
          ...options.headers,
        },
      })

      if (!retryResponse.ok) {
        const error = await retryResponse.text()
        console.error("[v0] Beds24 API Error:", error)
        throw new Error(`Beds24 API Error: ${retryResponse.status} - ${error}`)
      }

      return retryResponse.json()
    }

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Beds24 API Error:", error)
      throw new Error(`Beds24 API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Fetch all bookings from Beds24
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   */
  async getBookings(from?: string, to?: string): Promise<Beds24Booking[]> {
    const params = new URLSearchParams()
    if (from) params.append("arrivalFrom", from)
    if (to) params.append("arrivalTo", to)

    const endpoint = `/bookings?${params.toString()}`
    const response = await this.request<{ data: Beds24Booking[] }>(endpoint)
    return response.data || []
  }

  /**
   * Fetch a single booking by ID
   */
  async getBooking(bookingId: string): Promise<Beds24Booking> {
    const response = await this.request<{ data: Beds24Booking }>(`/bookings/${bookingId}`)
    return response.data
  }

  /**
   * Fetch all reviews from Beds24
   */
  async getReviews(): Promise<Beds24Review[]> {
    const response = await this.request<{ data: Beds24Review[] }>("/reviews")
    return response.data || []
  }

  /**
   * Fetch reviews for a specific booking
   */
  async getBookingReviews(bookingId: string): Promise<Beds24Review[]> {
    const response = await this.request<{ data: Beds24Review[] }>(`/bookings/${bookingId}/reviews`)
    return response.data || []
  }

  /**
   * Get all rooms from Beds24
   */
  async getRooms(): Promise<Beds24Room[]> {
    const response = await this.request<{ data: Beds24Room[] }>("/rooms")
    return response.data || []
  }

  /**
   * Block dates for a room (for maintenance or manual blocking)
   */
  async blockDates(roomId: string, from: string, to: string, reason = "maintenance"): Promise<void> {
    await this.request("/bookings", {
      method: "POST",
      body: JSON.stringify({
        roomId,
        arrival: from,
        departure: to,
        status: "blocked",
        notes: reason,
        firstName: "BLOCKED",
        lastName: reason.toUpperCase(),
      }),
    })
  }

  /**
   * Unblock dates for a room
   */
  async unblockDates(blockingId: string): Promise<void> {
    await this.request(`/bookings/${blockingId}`, {
      method: "DELETE",
    })
  }

  /**
   * Manually refresh the access token (for testing or maintenance)
   */
  async forceRefreshToken(): Promise<void> {
    await this.refreshAccessToken()
  }

  /**
   * Manually refresh the write access token (for testing or maintenance)
   */
  async forceRefreshWriteToken(): Promise<void> {
    await this.refreshWriteToken()
  }
}

// Export singleton instance
export const beds24Client = new Beds24Client()
