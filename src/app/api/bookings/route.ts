import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createBookingSchema = z.object({
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  flightId: z.string().optional(), // Optional for multi-flight bookings
  useDifferentFlights: z.boolean().optional(),
  departmentId: z.string().optional(),
  purpose: z.string().optional(),
  approvalRef: z.string().optional(),
  cost: z.number().optional(),
  profit: z.number().optional(),
  passengers: z.array(z.object({
    title: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    nationalId: z.string().optional(),
    passportNo: z.string().optional(),
    dateOfBirth: z.string(),
    nationality: z.string(),
    flightId: z.string().optional() // Individual flight for group bookings
  })).min(1).max(50)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")

    const where = status ? { status } : {}

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          flight: true,
          user: true,
          department: true,
          passengers: {
            include: {
              customer: true,
              flight: true // Include individual flight info
            }
          },
          invoice: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.booking.count({ where })
    ])

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBookingSchema.parse(body)

    // Determine if this is a multi-flight booking
    const isMultiFlight = validatedData.useDifferentFlights === true

    // For single flight bookings (individual or group with same flight)
    if (!isMultiFlight) {
      if (!validatedData.flightId) {
        return NextResponse.json({ error: "Flight ID is required" }, { status: 400 })
      }

      // Get flight details
      const flight = await prisma.flight.findUnique({
        where: { id: validatedData.flightId }
      })

      if (!flight) {
        return NextResponse.json({ error: "Flight not found" }, { status: 404 })
      }

      if (flight.availableSeats < validatedData.passengers.length) {
        return NextResponse.json({ error: "Not enough available seats" }, { status: 400 })
      }

      // Create or find customers
      const customers = await Promise.all(
        validatedData.passengers.map(async (passenger) => {
          const existingCustomer = await prisma.customer.findFirst({
            where: { email: passenger.email }
          })

          if (existingCustomer) {
            // Update existing customer data
            return prisma.customer.update({
              where: { id: existingCustomer.id },
              data: {
                title: passenger.title,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                phone: passenger.phone,
                nationalId: passenger.nationalId || null,
                passportNo: passenger.passportNo || null,
                dateOfBirth: new Date(passenger.dateOfBirth),
                nationality: passenger.nationality
              }
            })
          }

          return prisma.customer.create({
            data: {
              title: passenger.title,
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              email: passenger.email,
              phone: passenger.phone,
              nationalId: passenger.nationalId || null,
              passportNo: passenger.passportNo || null,
              dateOfBirth: new Date(passenger.dateOfBirth),
              nationality: passenger.nationality
            }
          })
        })
      )

      // Generate booking reference
      const bookingRef = "BK" + Date.now().toString().slice(-8)

      // Calculate total amount
      const totalAmount = flight.price * validatedData.passengers.length

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          bookingRef,
          type: validatedData.type,
          status: "CONFIRMED",
          totalAmount,
          cost: body.cost || null,
          profit: body.profit || null,
          userId: session.user.id,
          flightId: flight.id,
          departmentId: body.departmentId || null,
          purpose: body.purpose || null,
          approvalRef: body.approvalRef || null,
          passengers: {
            create: customers.map((customer, index) => ({
              customerId: customer.id,
              seatNumber: `${index + 1}A`,
              price: flight.price
            }))
          }
        },
        include: {
          flight: true,
          department: true,
          passengers: {
            include: {
              customer: true,
              flight: true
            }
          }
        }
      })

      // Update available seats
      await prisma.flight.update({
        where: { id: flight.id },
        data: {
          availableSeats: flight.availableSeats - validatedData.passengers.length
        }
      })

      return NextResponse.json(booking)
    } 
    // For multi-flight group bookings
    else {
      // Validate that all passengers have flight IDs
      const missingFlights = validatedData.passengers.some(p => !p.flightId)
      if (missingFlights) {
        return NextResponse.json({ error: "All passengers must have a flight ID for multi-flight bookings" }, { status: 400 })
      }

      // Get all unique flight IDs
      const flightIds = [...new Set(validatedData.passengers.map(p => p.flightId!))]
      
      // Fetch all flights
      const flights = await prisma.flight.findMany({
        where: { id: { in: flightIds } }
      })

      if (flights.length !== flightIds.length) {
        return NextResponse.json({ error: "One or more flights not found" }, { status: 404 })
      }

      // Create flight map for easy lookup
      const flightMap = new Map(flights.map(f => [f.id, f]))

      // Check seat availability for each flight
      const flightPassengerCount = new Map<string, number>()
      for (const passenger of validatedData.passengers) {
        const count = flightPassengerCount.get(passenger.flightId!) || 0
        flightPassengerCount.set(passenger.flightId!, count + 1)
      }

      for (const [flightId, count] of flightPassengerCount) {
        const flight = flightMap.get(flightId)!
        if (flight.availableSeats < count) {
          return NextResponse.json({ 
            error: `Not enough seats on flight ${flight.flightNumber}. Available: ${flight.availableSeats}, Requested: ${count}` 
          }, { status: 400 })
        }
      }

      // Create or find customers
      const customers = await Promise.all(
        validatedData.passengers.map(async (passenger) => {
          const existingCustomer = await prisma.customer.findFirst({
            where: { email: passenger.email }
          })

          if (existingCustomer) {
            return prisma.customer.update({
              where: { id: existingCustomer.id },
              data: {
                title: passenger.title,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                phone: passenger.phone,
                nationalId: passenger.nationalId || null,
                passportNo: passenger.passportNo || null,
                dateOfBirth: new Date(passenger.dateOfBirth),
                nationality: passenger.nationality
              }
            })
          }

          return prisma.customer.create({
            data: {
              title: passenger.title,
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              email: passenger.email,
              phone: passenger.phone,
              nationalId: passenger.nationalId || null,
              passportNo: passenger.passportNo || null,
              dateOfBirth: new Date(passenger.dateOfBirth),
              nationality: passenger.nationality
            }
          })
        })
      )

      // Generate booking reference
      const bookingRef = "BK" + Date.now().toString().slice(-8)

      // Calculate total amount
      let totalAmount = 0
      const passengerData = validatedData.passengers.map((passenger, index) => {
        const flight = flightMap.get(passenger.flightId!)!
        totalAmount += flight.price
        const customer = customers[index]
        return {
          customerId: customer.id,
          flightId: passenger.flightId,
          seatNumber: `${(index % 50) + 1}A`, // Simple seat assignment
          price: flight.price
        }
      })

      // Create booking with transaction
      const booking = await prisma.$transaction(async (tx) => {
        // Create the booking
        const newBooking = await tx.booking.create({
          data: {
            bookingRef,
            type: validatedData.type,
            status: "CONFIRMED",
            totalAmount,
            cost: body.cost || null,
            profit: body.profit || null,
            userId: session.user.id,
            flightId: null, // No single flight for multi-flight bookings
            departmentId: body.departmentId || null,
            purpose: body.purpose || null,
            approvalRef: body.approvalRef || null,
            passengers: {
              create: passengerData
            }
          },
          include: {
            department: true,
            passengers: {
              include: {
                customer: true,
                flight: true
              }
            }
          }
        })

        // Update available seats for each flight
        for (const [flightId, count] of flightPassengerCount) {
          await tx.flight.update({
            where: { id: flightId },
            data: {
              availableSeats: {
                decrement: count
              }
            }
          })
        }

        return newBooking
      })

      return NextResponse.json(booking)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}