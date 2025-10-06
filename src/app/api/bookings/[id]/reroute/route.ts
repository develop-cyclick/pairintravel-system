import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSessionOrganizationId } from "@/lib/organization"

// Configuration for re-route fee
const REROUTE_FEE_PER_PASSENGER = 800 // ฿800 per passenger (higher than reschedule)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()

    const { id } = await params
    const body = await request.json()
    const { newFlight, additionalFee, airportTax, passengerIds, reason } = body

    // Get current booking with all details (filtered by organization)
    const booking = await prisma.booking.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        passengers: {
          include: {
            customer: true
          }
        },
        purchaseOrder: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Validate new flight data
    if (!newFlight || !newFlight.flightNumber || !newFlight.airline || !newFlight.price || !newFlight.origin || !newFlight.destination) {
      return NextResponse.json({ error: "Invalid flight data provided. Origin and destination are required for re-routing." }, { status: 400 })
    }

    // Determine which passengers to re-route
    const passengersToReRoute = passengerIds && passengerIds.length > 0
      ? booking.passengers.filter(p => passengerIds.includes(p.id))
      : booking.passengers // If no specific passengers, re-route all

    if (passengersToReRoute.length === 0) {
      return NextResponse.json({ error: "No passengers selected for re-route" }, { status: 400 })
    }

    const passengerCount = passengersToReRoute.length
    const originalPassengerCount = booking.passengers.length
    const isPartialReRoute = passengerCount < originalPassengerCount

    // Calculate pricing with custom additional fee
    const perPassengerServiceFee = booking.totalServiceFee / originalPassengerCount
    const reRouteFee = (additionalFee || REROUTE_FEE_PER_PASSENGER) * passengerCount
    const newBookingServiceFee = perPassengerServiceFee * passengerCount
    const newBookingTotal = (newFlight.price * passengerCount) + newBookingServiceFee + reRouteFee

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedOriginalBooking = null
      let newBooking = null

      if (isPartialReRoute) {
        // Remove passengers from original booking
        await tx.bookingPassenger.deleteMany({
          where: {
            bookingId: booking.id,
            id: { in: passengerIds }
          }
        })

        // Update original booking amounts
        const remainingPassengers = originalPassengerCount - passengerCount
        const remainingServiceFee = perPassengerServiceFee * remainingPassengers
        const remainingTotal = (booking.basePrice * remainingPassengers) + remainingServiceFee

        updatedOriginalBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            totalServiceFee: remainingServiceFee,
            totalAmount: remainingTotal,
            totalCost: booking.basePrice * remainingPassengers
          }
        })

        // Generate new booking reference
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 5).toUpperCase()
        const newBookingRef = `${booking.bookingRef}-RR${timestamp}${random}`

        // Calculate proportional additional charges (if this is partial re-route)
        const proportionalBaggageCharge = isPartialReRoute
          ? (booking.baggageCharge || 0) * (passengerCount / booking.passengers.length)
          : (booking.baggageCharge || 0)
        const proportionalMealCharge = isPartialReRoute
          ? (booking.mealCharge || 0) * (passengerCount / booking.passengers.length)
          : (booking.mealCharge || 0)
        const proportionalSeatCharge = isPartialReRoute
          ? (booking.seatSelectionCharge || 0) * (passengerCount / booking.passengers.length)
          : (booking.seatSelectionCharge || 0)
        // Use the new airport tax value from the re-route form
        const newAirportTax = airportTax || 0

        // Create new booking for re-routed passengers
        newBooking = await tx.booking.create({
          data: {
            organizationId,
            bookingRef: newBookingRef,
            purchaseOrderId: booking.purchaseOrderId,
            type: passengerCount === 1 ? "INDIVIDUAL" : "GROUP",
            status: "CONFIRMED",
            flightNumber: newFlight.flightNumber,
            airline: newFlight.airline,
            origin: newFlight.origin,
            destination: newFlight.destination,
            departureDate: new Date(newFlight.departureTime),
            basePrice: newFlight.price,
            totalCost: newFlight.price * passengerCount,
            totalServiceFee: newBookingServiceFee,
            // Copy additional charges from original booking (proportional for partial re-route)
            baggageCharge: proportionalBaggageCharge,
            mealCharge: proportionalMealCharge,
            seatSelectionCharge: proportionalSeatCharge,
            airportTax: newAirportTax,
            // Include additional charges in totalAmount
            totalAmount: newBookingTotal + proportionalBaggageCharge + proportionalMealCharge + proportionalSeatCharge + newAirportTax,
            isChange: true,
            originalBookingId: booking.id,
            changeFee: reRouteFee,
            changeReason: reason || "Route changed",
            userId: session.user!.id,
            departmentId: booking.departmentId
          }
        })

        // Add passengers to new booking
        await tx.bookingPassenger.createMany({
          data: passengersToReRoute.map(p => ({
            bookingId: newBooking.id,
            customerId: p.customerId,
            seatNumber: null, // Will be assigned later
            individualPrice: newFlight.price,
            individualCost: newFlight.price,
            individualServiceFee: perPassengerServiceFee
          }))
        })

      } else {
        // Full booking re-route - update existing booking
        // Use new airport tax value from the re-route form
        const newAirportTax = airportTax || 0
        const additionalChargesTotal = (booking.baggageCharge || 0) +
                                       (booking.mealCharge || 0) +
                                       (booking.seatSelectionCharge || 0) +
                                       newAirportTax

        newBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "RESCHEDULED",
            flightNumber: newFlight.flightNumber,
            airline: newFlight.airline,
            origin: newFlight.origin,
            destination: newFlight.destination,
            departureDate: new Date(newFlight.departureTime),
            basePrice: newFlight.price,
            totalCost: newFlight.price * passengerCount,
            // Update airport tax with new value
            airportTax: newAirportTax,
            // Include additional charges in totalAmount
            totalAmount: newBookingTotal + additionalChargesTotal,
            isChange: true,
            changeFee: reRouteFee,
            changeReason: reason || "Route changed"
          }
        })

        // Update individual passenger pricing
        await tx.bookingPassenger.updateMany({
          where: { bookingId: booking.id },
          data: {
            individualPrice: newFlight.price,
            individualCost: newFlight.price,
            individualServiceFee: perPassengerServiceFee
          }
        })
      }

      // Create reschedule history (reusing same table, but with route change)
      await tx.rescheduleHistory.create({
        data: {
          bookingId: newBooking.id,
          oldFlightId: `${booking.flightNumber} (${booking.origin}-${booking.destination})`,
          newFlightId: `${newFlight.flightNumber} (${newFlight.origin}-${newFlight.destination})`,
          oldDeparture: booking.departureDate,
          newDeparture: new Date(newFlight.departureTime),
          priceDiff: newBookingTotal - (booking.basePrice * passengerCount),
          reason: reason || "Route changed"
        }
      })

      // Update Purchase Order total amount
      // Recalculate PO total from all bookings
      const allBookings = await tx.booking.findMany({
        where: { purchaseOrderId: booking.purchaseOrderId }
      })

      const newPOTotal = allBookings.reduce((sum, b) => sum + b.totalAmount, 0)
      const newPOCost = allBookings.reduce((sum, b) => sum + b.totalCost, 0)
      const newPOServiceFee = allBookings.reduce((sum, b) => sum + b.totalServiceFee, 0)
      const newPOAirportTax = allBookings.reduce((sum, b) => sum + (b.airportTax || 0), 0)

      await tx.purchaseOrder.update({
        where: { id: booking.purchaseOrderId },
        data: {
          totalAmount: newPOTotal,
          totalCost: newPOCost,
          totalServiceFee: newPOServiceFee,
          totalAirportTax: newPOAirportTax
        }
      })

      // Return both bookings for partial re-route, or just the updated booking
      if (isPartialReRoute) {
        return {
          originalBooking: updatedOriginalBooking,
          newBooking: newBooking,
          reRouteFee: reRouteFee,
          message: `${passengerCount} passenger(s) re-routed successfully`
        }
      } else {
        return {
          booking: newBooking,
          reRouteFee: reRouteFee,
          message: "Booking re-routed successfully"
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error re-routing booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}