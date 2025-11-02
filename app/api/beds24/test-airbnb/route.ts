import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiUrl = process.env.BEDS24_API_URL || "https://beds24.com/api/v2"
    const token = process.env.BEDS24_READ_TOKEN

    if (!token) {
      return NextResponse.json({ error: "BEDS24_READ_TOKEN not configured" }, { status: 500 })
    }

    // Test 1: Tutte le prenotazioni
    console.log("[v0] Testing: All bookings")
    const allUrl = `${apiUrl}/bookings?checkInFrom=2015-01-01&checkOutTo=2100-12-31&limit=100`
    const allResponse = await fetch(allUrl, {
      headers: {
        token: token,
        Accept: "application/json",
      },
    })
    const allData = await allResponse.json()
    console.log("[v0] All bookings count:", allData.data?.length || 0)

    // Test 2: Solo Airbnb XML (apiSourceId=46)
    console.log("[v0] Testing: Airbnb XML (apiSourceId=46)")
    const airbnbXmlUrl = `${apiUrl}/bookings?apiSourceId=46&checkInFrom=2015-01-01&checkOutTo=2100-12-31&limit=100`
    const airbnbXmlResponse = await fetch(airbnbXmlUrl, {
      headers: {
        token: token,
        Accept: "application/json",
      },
    })
    const airbnbXmlData = await airbnbXmlResponse.json()
    console.log("[v0] Airbnb XML bookings count:", airbnbXmlData.data?.length || 0)

    // Test 3: Solo Airbnb iCal (apiSourceId=10)
    console.log("[v0] Testing: Airbnb iCal (apiSourceId=10)")
    const airbnbIcalUrl = `${apiUrl}/bookings?apiSourceId=10&checkInFrom=2015-01-01&checkOutTo=2100-12-31&limit=100`
    const airbnbIcalResponse = await fetch(airbnbIcalUrl, {
      headers: {
        token: token,
        Accept: "application/json",
      },
    })
    const airbnbIcalData = await airbnbIcalResponse.json()
    console.log("[v0] Airbnb iCal bookings count:", airbnbIcalData.data?.length || 0)

    // Analizza tutte le prenotazioni per vedere gli apiSourceId
    const apiSourceIds = new Map<number, number>()
    if (allData.data) {
      for (const booking of allData.data) {
        const sourceId = booking.apiSourceId || 0
        apiSourceIds.set(sourceId, (apiSourceIds.get(sourceId) || 0) + 1)
      }
    }

    console.log("[v0] ApiSourceId breakdown:", Object.fromEntries(apiSourceIds))

    return NextResponse.json({
      success: true,
      summary: {
        totalBookings: allData.data?.length || 0,
        airbnbXml: airbnbXmlData.data?.length || 0,
        airbnbIcal: airbnbIcalData.data?.length || 0,
        apiSourceIdBreakdown: Object.fromEntries(apiSourceIds),
      },
      details: {
        allBookings: {
          count: allData.data?.length || 0,
          sample: allData.data?.slice(0, 2) || [],
        },
        airbnbXml: {
          count: airbnbXmlData.data?.length || 0,
          sample: airbnbXmlData.data?.slice(0, 2) || [],
          rawResponse: airbnbXmlData,
        },
        airbnbIcal: {
          count: airbnbIcalData.data?.length || 0,
          sample: airbnbIcalData.data?.slice(0, 2) || [],
          rawResponse: airbnbIcalData,
        },
      },
    })
  } catch (error) {
    console.error("[v0] Test error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
