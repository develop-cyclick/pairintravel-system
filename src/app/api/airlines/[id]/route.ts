import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateAirlineSchema = z.object({
  code: z.string().min(2).max(10).optional(),
  name: z.string().min(1).optional(),
  fullName: z.string().optional().nullable(),
  country: z.string().optional(),
  logo: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional()
})

// GET - Get single airline
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const airline = await prisma.airline.findUnique({
      where: { id: params.id }
    })

    if (!airline) {
      return NextResponse.json({ error: "Airline not found" }, { status: 404 })
    }

    return NextResponse.json(airline)
  } catch (error) {
    console.error("Error fetching airline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update airline (Admin only)
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateAirlineSchema.parse(body)

    // Check if airline exists
    const existingAirline = await prisma.airline.findUnique({
      where: { id: params.id }
    })

    if (!existingAirline) {
      return NextResponse.json({ error: "Airline not found" }, { status: 404 })
    }

    // If updating code, check if new code already exists
    if (validatedData.code && validatedData.code !== existingAirline.code) {
      const codeExists = await prisma.airline.findUnique({
        where: { code: validatedData.code.toUpperCase() }
      })

      if (codeExists) {
        return NextResponse.json({ error: "Airline code already exists" }, { status: 400 })
      }
    }

    // Update airline
    const airline = await prisma.airline.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        code: validatedData.code ? validatedData.code.toUpperCase() : undefined
      }
    })

    return NextResponse.json(airline)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating airline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete airline (Admin only)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if airline exists
    const existingAirline = await prisma.airline.findUnique({
      where: { id: params.id }
    })

    if (!existingAirline) {
      return NextResponse.json({ error: "Airline not found" }, { status: 404 })
    }

    // Instead of deleting, deactivate the airline to preserve data integrity
    await prisma.airline.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "Airline deactivated successfully" })
  } catch (error) {
    console.error("Error deleting airline:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}