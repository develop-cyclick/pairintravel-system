import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createAirlineSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1),
  fullName: z.string().optional(),
  country: z.string().default("Thailand"),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false)
})

// GET - Get all airlines
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get("active") === "true"
    const onlyPopular = searchParams.get("popular") === "true"

    const where: any = {}
    if (onlyActive) where.isActive = true
    if (onlyPopular) where.isPopular = true

    const airlines = await prisma.airline.findMany({
      where,
      orderBy: [
        { isPopular: "desc" },
        { name: "asc" }
      ]
    })

    return NextResponse.json(airlines)
  } catch (error) {
    console.error("Error fetching airlines:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new airline (Admin and Agent)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AGENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAirlineSchema.parse(body)

    // Check if airline code already exists
    const existingAirline = await prisma.airline.findUnique({
      where: { code: validatedData.code.toUpperCase() }
    })

    if (existingAirline) {
      return NextResponse.json({ error: "Airline code already exists" }, { status: 400 })
    }

    // Create airline
    const airline = await prisma.airline.create({
      data: {
        ...validatedData,
        code: validatedData.code.toUpperCase()
      }
    })

    return NextResponse.json(airline)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating airline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}