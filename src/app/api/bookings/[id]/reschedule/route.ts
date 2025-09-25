import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { newFlightId, reason } = body

    // Get current booking
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        flight: true,
        passengers: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Get new flight
    const newFlight = await prisma.flight.findUnique({
      where: { id: newFlightId }
    })

    if (!newFlight) {
      return NextResponse.json({ error: "New flight not found" }, { status: 404 })
    }

    if (newFlight.availableSeats < booking.passengers.length) {
      return NextResponse.json({ error: "Not enough seats on new flight" }, { status: 400 })
    }

    // Calculate price difference
    const priceDiff = (newFlight.price - booking.flight.price) * booking.passengers.length

    // Create reschedule history
    await prisma.rescheduleHistory.create({
      data: {
        bookingId: booking.id,
        oldFlightId: booking.flightId,
        newFlightId: newFlightId,
        oldDeparture: booking.flight.departureTime,
        newDeparture: newFlight.departureTime,
        priceDiff,
        reason
      }
    })

    // Update seat availability
    await prisma.flight.update({
      where: { id: booking.flightId },
      data: {
        availableSeats: {
          increment: booking.passengers.length
        }
      }
    })

    await prisma.flight.update({
      where: { id: newFlightId },
      data: {
        availableSeats: {
          decrement: booking.passengers.length
        }
      }
    })

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        flightId: newFlightId,
        status: "RESCHEDULED",
        totalAmount: newFlight.price * booking.passengers.length
      },
      include: {
        flight: true,
        passengers: {
          include: {
            customer: true
          }
        },
        rescheduleHistory: true
      }
    })

    return NextResponse.json({
      booking: updatedBooking,
      priceDifference: priceDiff
    })
  } catch (error) {
    console.error("Error rescheduling booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}