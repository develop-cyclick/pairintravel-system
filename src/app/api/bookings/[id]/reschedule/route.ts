import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Configuration for reschedule fee
const RESCHEDULE_FEE_PER_PASSENGER = 500 // ฿500 per passenger

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { newFlight, additionalFee, airportTax, passengerIds, reason } = body

    // Get current booking with all details
    const booking = await prisma.booking.findUnique({
      where: { id },
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
    if (!newFlight || !newFlight.flightNumber || !newFlight.airline || !newFlight.price) {
      return NextResponse.json({ error: "Invalid flight data provided" }, { status: 400 })
    }

    // Determine which passengers to reschedule
    const passengersToReschedule = passengerIds && passengerIds.length > 0
      ? booking.passengers.filter(p => passengerIds.includes(p.id))
      : booking.passengers // If no specific passengers, reschedule all

    if (passengersToReschedule.length === 0) {
      return NextResponse.json({ error: "No passengers selected for reschedule" }, { status: 400 })
    }

    // Note: Since we're using manual flight input, we don't check seat availability

    const passengerCount = passengersToReschedule.length
    const originalPassengerCount = booking.passengers.length
    const isPartialReschedule = passengerCount < originalPassengerCount

    // Calculate pricing with custom additional fee
    // Note: For reschedule, passengers only pay the reschedule fee, not the new flight price
    const perPassengerServiceFee = booking.totalServiceFee / originalPassengerCount
    const rescheduleFee = (additionalFee || RESCHEDULE_FEE_PER_PASSENGER) * passengerCount
    const newBookingServiceFee = perPassengerServiceFee * passengerCount
    // Original cost per passenger
    const originalCostPerPassenger = booking.totalCost / originalPassengerCount
    const originalServiceFeeForPassengers = perPassengerServiceFee * passengerCount
    // New total = original cost + reschedule fee (passengers only pay reschedule fee)
    const newBookingTotal = (originalCostPerPassenger * passengerCount) + originalServiceFeeForPassengers + rescheduleFee

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedOriginalBooking = null
      let newBooking = null

      if (isPartialReschedule) {
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
        const newBookingRef = `${booking.bookingRef}-R${timestamp}${random}`

        // Create new booking for rescheduled passengers
        // Calculate proportional additional charges (if this is partial reschedule)
        const proportionalBaggageCharge = isPartialReschedule
          ? (booking.baggageCharge || 0) * (passengerCount / booking.passengers.length)
          : (booking.baggageCharge || 0)
        const proportionalMealCharge = isPartialReschedule
          ? (booking.mealCharge || 0) * (passengerCount / booking.passengers.length)
          : (booking.mealCharge || 0)
        const proportionalSeatCharge = isPartialReschedule
          ? (booking.seatSelectionCharge || 0) * (passengerCount / booking.passengers.length)
          : (booking.seatSelectionCharge || 0)
        // Use the new airport tax value from the reschedule form
        const newAirportTax = airportTax || 0

        newBooking = await tx.booking.create({
          data: {
            bookingRef: newBookingRef,
            purchaseOrderId: booking.purchaseOrderId,
            type: passengerCount === 1 ? "INDIVIDUAL" : "GROUP",
            status: "CONFIRMED",
            flightNumber: newFlight.flightNumber,
            airline: newFlight.airline,
            origin: newFlight.origin || booking.origin,
            destination: newFlight.destination || booking.destination,
            departureDate: new Date(newFlight.departureTime),
            basePrice: newFlight.price,
            totalCost: newFlight.price * passengerCount,
            totalServiceFee: newBookingServiceFee,
            // Copy additional charges from original booking (proportional for partial reschedule)
            baggageCharge: proportionalBaggageCharge,
            mealCharge: proportionalMealCharge,
            seatSelectionCharge: proportionalSeatCharge,
            airportTax: newAirportTax,
            // Include additional charges in totalAmount
            totalAmount: newBookingTotal + proportionalBaggageCharge + proportionalMealCharge + proportionalSeatCharge + newAirportTax,
            isChange: true,
            originalBookingId: booking.id,
            changeFee: rescheduleFee,
            changeReason: reason || "Passenger requested reschedule",
            userId: session.user!.id,
            departmentId: booking.departmentId
          }
        })

        // Add passengers to new booking
        await tx.bookingPassenger.createMany({
          data: passengersToReschedule.map(p => ({
            bookingId: newBooking.id,
            customerId: p.customerId,
            seatNumber: null, // Will be assigned later
            individualPrice: newFlight.price,
            individualCost: newFlight.price,
            individualServiceFee: perPassengerServiceFee
          }))
        })

      } else {
        // Full booking reschedule - update existing booking
        // Use new airport tax value from the reschedule form
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
            origin: newFlight.origin || booking.origin,
            destination: newFlight.destination || booking.destination,
            departureDate: new Date(newFlight.departureTime),
            basePrice: newFlight.price,
            totalCost: newFlight.price * passengerCount,
            // Update airport tax with new value
            airportTax: newAirportTax,
            // Include additional charges in totalAmount
            totalAmount: newBookingTotal + additionalChargesTotal,
            isChange: true,
            changeFee: rescheduleFee,
            changeReason: reason || "Booking rescheduled"
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

      // Create reschedule history
      await tx.rescheduleHistory.create({
        data: {
          bookingId: newBooking.id,
          oldFlightId: booking.flightId || booking.flightNumber || "",
          newFlightId: newFlight.flightNumber,
          oldDeparture: booking.departureDate,
          newDeparture: new Date(newFlight.departureTime),
          priceDiff: newBookingTotal - (booking.basePrice * passengerCount),
          reason: reason || "Passenger requested reschedule"
        }
      })

      // Note: Since we're using manual flight input, we don't update flight seat availability

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

      // Return both bookings for partial reschedule, or just the updated booking
      if (isPartialReschedule) {
        return {
          originalBooking: updatedOriginalBooking,
          newBooking: newBooking,
          rescheduleFee: rescheduleFee,
          message: `${passengerCount} passenger(s) rescheduled successfully`
        }
      } else {
        return {
          booking: newBooking,
          rescheduleFee: rescheduleFee,
          message: "Booking rescheduled successfully"
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error rescheduling booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}