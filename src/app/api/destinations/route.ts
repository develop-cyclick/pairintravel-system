import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createDestinationSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1),
  fullName: z.string().optional(),
  city: z.string().min(1),
  country: z.string().default("Thailand"),
  timezone: z.string().optional(),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false)
})

// GET - Get all destinations
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

    const destinations = await prisma.destination.findMany({
      where,
      orderBy: [
        { isPopular: "desc" },
        { name: "asc" }
      ]
    })

    return NextResponse.json(destinations)
  } catch (error) {
    console.error("Error fetching destinations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new destination (Admin and Agent)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AGENT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createDestinationSchema.parse(body)

    // Check if destination code already exists
    const existingDestination = await prisma.destination.findUnique({
      where: { code: validatedData.code.toUpperCase() }
    })

    if (existingDestination) {
      return NextResponse.json({ error: "Destination code already exists" }, { status: 400 })
    }

    // Create destination
    const destination = await prisma.destination.create({
      data: {
        ...validatedData,
        code: validatedData.code.toUpperCase()
      }
    })

    return NextResponse.json(destination)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating destination:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}