import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { getSessionOrganizationId, verifyOrganizationAccess } from "@/lib/organization"

const passengerSchema = z.object({
  customerId: z.string().optional(),
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  nationalId: z.string().optional().nullable(),
  passportNo: z.string().optional().nullable(),
  dateOfBirth: z.string(),
  nationality: z.string(),
})

const addBookingSchema = z.object({
  // Original booking reference (for changes)
  originalBookingId: z.string().optional(),
  changeFee: z.number().default(0),
  changeReason: z.string().optional(),

  // Flight information
  flightNumber: z.string(),
  airline: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),

  // Pricing
  costPerPassenger: z.number(),
  serviceFeePerPassenger: z.number(),

  // Additional charges
  baggageCharge: z.number().default(0),
  mealCharge: z.number().default(0),
  seatSelectionCharge: z.number().default(0),
  airportTax: z.number().default(0),

  // Passengers (can be subset of original)
  passengers: z.array(passengerSchema).min(1),
})

// POST - Add a new booking to existing purchase order
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Received body:", JSON.stringify(body, null, 2))

    let validatedData
    try {
      validatedData = addBookingSchema.parse(body)
      console.log("Validation successful")
    } catch (zodError) {
      console.error("Zod error caught:", zodError)
      if (zodError instanceof z.ZodError) {
        console.error("Zod validation failed:", JSON.stringify(zodError.errors, null, 2))
        return NextResponse.json({
          error: "Validation error",
          details: zodError.errors
        }, { status: 400 })
      }
      throw zodError
    }

    const organizationId = await getSessionOrganizationId()

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get the purchase order and verify organization access
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        bookings: true,
        department: true,
        customer: true
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    // Check if this is a change booking
    const isChange = !!validatedData.originalBookingId

    // Generate booking reference
    const bookingRef = `BK${Date.now()}${Math.random().toString(36).substr(2, 5)}`

    // Calculate pricing
    const passengerCount = validatedData.passengers.length
    const basePrice = validatedData.costPerPassenger + validatedData.serviceFeePerPassenger
    const totalCost = validatedData.costPerPassenger * passengerCount
    const totalServiceFee = validatedData.serviceFeePerPassenger * passengerCount
    // Include all additional charges in total amount
    const totalAmount = (basePrice * passengerCount) +
                       validatedData.baggageCharge +
                       validatedData.mealCharge +
                       validatedData.seatSelectionCharge +
                       validatedData.airportTax
    const totalChangeFee = validatedData.changeFee * passengerCount

    // Create booking with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Process passengers - create or update customers
      const customerMap = new Map<string, any>()

      for (const passenger of validatedData.passengers) {
        // If customerId is provided, use existing customer
        if (passenger.customerId) {
          const existingCustomer = await tx.customer.findUnique({
            where: { id: passenger.customerId }
          })
          if (existingCustomer) {
            customerMap.set(passenger.email, existingCustomer)
          }
        }

        // Otherwise, find or create customer
        if (!customerMap.has(passenger.email)) {
          const existingCustomer = await tx.customer.findFirst({
            where: {
              email: passenger.email,
              organizationId
            }
          })

          if (existingCustomer) {
            const updatedCustomer = await tx.customer.update({
              where: { id: existingCustomer.id },
              data: {
                title: passenger.title,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                phone: passenger.phone,
                nationalId: passenger.nationalId,
                passportNo: passenger.passportNo,
                dateOfBirth: new Date(passenger.dateOfBirth),
                nationality: passenger.nationality
              }
            })
            customerMap.set(passenger.email, updatedCustomer)
          } else {
            const newCustomer = await tx.customer.create({
              data: {
                organizationId,
                title: passenger.title,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                email: passenger.email,
                phone: passenger.phone,
                nationalId: passenger.nationalId,
                passportNo: passenger.passportNo,
                dateOfBirth: new Date(passenger.dateOfBirth),
                nationality: passenger.nationality
              }
            })
            customerMap.set(passenger.email, newCustomer)
          }
        }
      }

      const uniqueCustomers = Array.from(customerMap.values())

      // Create the new booking
      const booking = await tx.booking.create({
        data: {
          organizationId,
          bookingRef,
          purchaseOrderId: params.id,
          type: passengerCount > 1 ? "GROUP" : "INDIVIDUAL",
          status: "CONFIRMED",

          // Flight information
          flightNumber: validatedData.flightNumber,
          airline: validatedData.airline,
          origin: validatedData.origin,
          destination: validatedData.destination,
          departureDate: new Date(validatedData.departureDate),

          // Pricing
          basePrice,
          totalCost,
          totalServiceFee,
          totalAmount: totalAmount + totalChangeFee,

          // Additional charges
          baggageCharge: validatedData.baggageCharge,
          mealCharge: validatedData.mealCharge,
          seatSelectionCharge: validatedData.seatSelectionCharge,
          airportTax: validatedData.airportTax,

          // Change tracking
          isChange,
          originalBookingId: validatedData.originalBookingId,
          changeFee: totalChangeFee,
          changeReason: validatedData.changeReason,

          // Relations
          userId: user.id,
          departmentId: purchaseOrder.departmentId,
          passengers: {
            create: uniqueCustomers.map((customer) => ({
              customerId: customer.id,
              individualPrice: basePrice,
              individualCost: validatedData.costPerPassenger,
              individualServiceFee: validatedData.serviceFeePerPassenger,
            }))
          }
        },
        include: {
          passengers: {
            include: {
              customer: true
            }
          }
        }
      })

      // If this is a change booking, update the original booking status
      if (validatedData.originalBookingId) {
        await tx.booking.update({
          where: { id: validatedData.originalBookingId },
          data: { status: "RESCHEDULED" }
        })

        // Create reschedule history
        await tx.rescheduleHistory.create({
          data: {
            bookingId: booking.id,
            oldFlightId: validatedData.originalBookingId,
            newFlightId: booking.id,
            oldDeparture: new Date(),
            newDeparture: new Date(validatedData.departureDate),
            priceDiff: totalChangeFee,
            reason: validatedData.changeReason
          }
        })
      }

      // Update purchase order totals
      const updatedBookings = await tx.booking.findMany({
        where: { purchaseOrderId: params.id }
      })

      const newTotalAmount = updatedBookings.reduce((sum, b) => sum + b.totalAmount, 0)
      const newCost = updatedBookings.reduce((sum, b) => sum + b.totalCost, 0)
      const newServiceFee = updatedBookings.reduce((sum, b) => sum + b.totalServiceFee, 0)
      const newChangeFees = updatedBookings.reduce((sum, b) => sum + b.changeFee, 0)
      const newAirportTax = updatedBookings.reduce((sum, b) => sum + (b.airportTax || 0), 0)
      // New profit formula: Total Amount - Total Cost + Airport Tax
      const newProfit = newTotalAmount - newCost + newAirportTax

      await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          totalAmount: newTotalAmount,
          cost: newCost,
          serviceFee: newServiceFee,
          profit: newProfit,
          updatedAt: new Date()
        }
      })

      return booking
    })

    return NextResponse.json({
      success: true,
      booking: result,
      message: isChange
        ? `Flight change booking ${result.bookingRef} created successfully`
        : `New booking ${result.bookingRef} added to purchase order`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error details:", JSON.stringify(error.errors, null, 2))
      return NextResponse.json({
        error: "Validation error",
        details: error.errors
      }, { status: 400 })
    }

    console.error("Error adding booking to purchase order:", error)
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      // Return 400 for known Prisma errors
      if (error.message.includes("Foreign key constraint") ||
          error.message.includes("Unique constraint") ||
          error.message.includes("not found")) {
        return NextResponse.json({
          error: error.message
        }, { status: 400 })
      }
    }
    return NextResponse.json({
      error: "Failed to add booking to purchase order"
    }, { status: 500 })
  }
}