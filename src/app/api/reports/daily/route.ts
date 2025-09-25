import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0]
    
    const startDate = new Date(date)
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 1)

    // Get bookings for the day
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        flight: true,
        invoice: true
      }
    })

    // Get flights for the day
    const flights = await prisma.flight.findMany({
      where: {
        departureTime: {
          gte: startDate,
          lt: endDate
        }
      }
    })

    // Calculate statistics
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
    const confirmedBookings = bookings.filter(b => b.status === "CONFIRMED").length
    const cancelledBookings = bookings.filter(b => b.status === "CANCELLED").length
    const totalFlights = flights.length
    const totalPassengers = await prisma.bookingPassenger.count({
      where: {
        booking: {
          createdAt: {
            gte: startDate,
            lt: endDate
          }
        }
      }
    })

    // Get revenue by flight
    const revenueByFlight = bookings.reduce((acc, booking) => {
      const flightKey = `${booking.flight.origin} → ${booking.flight.destination}`
      if (!acc[flightKey]) {
        acc[flightKey] = 0
      }
      acc[flightKey] += booking.totalAmount
      return acc
    }, {} as Record<string, number>)

    // Get booking trends by hour
    const bookingsByHour = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(startDate)
      hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(startDate)
      hourEnd.setHours(hour + 1, 0, 0, 0)
      
      return {
        hour,
        count: bookings.filter(b => 
          b.createdAt >= hourStart && b.createdAt < hourEnd
        ).length
      }
    })

    const report = {
      date,
      summary: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue,
        totalFlights,
        totalPassengers,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0
      },
      revenueByFlight: Object.entries(revenueByFlight).map(([route, revenue]) => ({
        route,
        revenue
      })),
      bookingsByHour,
      topFlights: flights
        .sort((a, b) => (b.totalSeats - b.availableSeats) - (a.totalSeats - a.availableSeats))
        .slice(0, 5)
        .map(f => ({
          flightNumber: f.flightNumber,
          route: `${f.origin} → ${f.destination}`,
          occupancy: ((f.totalSeats - f.availableSeats) / f.totalSeats * 100).toFixed(1) + '%'
        }))
    }

    // Store report in database
    await prisma.report.create({
      data: {
        type: "BOOKING",
        period: "DAILY",
        startDate,
        endDate,
        data: report as any,
        generatedBy: session.user.id
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error generating daily report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}