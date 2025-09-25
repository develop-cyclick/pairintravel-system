import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createFlightSchema = z.object({
  flightNumber: z.string(),
  airline: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  price: z.number().positive(),
  totalSeats: z.number().int().positive().optional(),
  availableSeats: z.number().int().positive().optional(),
  status: z.enum(["SCHEDULED", "DELAYED", "CANCELLED", "COMPLETED"]).optional()
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const where: any = {}
    
    if (origin) where.origin = { contains: origin, mode: "insensitive" }
    if (destination) where.destination = { contains: destination, mode: "insensitive" }
    if (status) where.status = status
    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      where.departureTime = {
        gte: startDate,
        lt: endDate
      }
    }

    const flights = await prisma.flight.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true
          }
        },
        bookings: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { departureTime: "asc" }
    })

    return NextResponse.json(flights)
  } catch (error) {
    console.error("Error fetching flights:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow both ADMIN and AGENT to create flights
    if (session.user.role !== "ADMIN" && session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createFlightSchema.parse(body)

    // Check if flight already exists with same flight number and departure time
    const departureTime = new Date(validatedData.departureTime)
    const existingFlight = await prisma.flight.findFirst({
      where: {
        flightNumber: validatedData.flightNumber,
        departureTime: departureTime
      }
    })

    if (existingFlight) {
      // Return existing flight instead of creating a duplicate
      return NextResponse.json(existingFlight)
    }

    const flight = await prisma.flight.create({
      data: {
        flightNumber: validatedData.flightNumber,
        airline: validatedData.airline,
        origin: validatedData.origin,
        destination: validatedData.destination,
        departureTime: departureTime,
        arrivalTime: new Date(validatedData.arrivalTime),
        price: validatedData.price,
        totalSeats: validatedData.totalSeats || 100,
        availableSeats: validatedData.availableSeats || validatedData.totalSeats || 100,
        status: validatedData.status || "SCHEDULED"
      }
    })

    return NextResponse.json(flight)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating flight:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}