import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")
    const departureDate = searchParams.get("departureDate")
    const passengers = parseInt(searchParams.get("passengers") || "1")

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: "Origin, destination, and departure date are required" },
        { status: 400 }
      )
    }

    const startDate = new Date(departureDate)
    const endDate = new Date(departureDate)
    endDate.setDate(endDate.getDate() + 1)

    const flights = await prisma.flight.findMany({
      where: {
        origin: { contains: origin, mode: "insensitive" },
        destination: { contains: destination, mode: "insensitive" },
        departureTime: {
          gte: startDate,
          lt: endDate
        },
        availableSeats: {
          gte: passengers
        },
        status: "SCHEDULED"
      },
      orderBy: { departureTime: "asc" }
    })

    return NextResponse.json(flights)
  } catch (error) {
    console.error("Error searching flights:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}