import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateDestinationSchema = z.object({
  code: z.string().min(2).max(10).optional(),
  name: z.string().min(1).optional(),
  fullName: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  country: z.string().optional(),
  timezone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional()
})

// GET - Get single destination
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

    const destination = await prisma.destination.findUnique({
      where: { id: params.id }
    })

    if (!destination) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 })
    }

    return NextResponse.json(destination)
  } catch (error) {
    console.error("Error fetching destination:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update destination (Admin only)
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
    const validatedData = updateDestinationSchema.parse(body)

    // Check if destination exists
    const existingDestination = await prisma.destination.findUnique({
      where: { id: params.id }
    })

    if (!existingDestination) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 })
    }

    // If updating code, check if new code already exists
    if (validatedData.code && validatedData.code !== existingDestination.code) {
      const codeExists = await prisma.destination.findUnique({
        where: { code: validatedData.code.toUpperCase() }
      })

      if (codeExists) {
        return NextResponse.json({ error: "Destination code already exists" }, { status: 400 })
      }
    }

    // Update destination
    const destination = await prisma.destination.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        code: validatedData.code ? validatedData.code.toUpperCase() : undefined
      }
    })

    return NextResponse.json(destination)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating destination:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete destination (Admin only)
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

    // Check if destination exists
    const existingDestination = await prisma.destination.findUnique({
      where: { id: params.id }
    })

    if (!existingDestination) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 })
    }

    // Instead of deleting, deactivate the destination to preserve data integrity
    await prisma.destination.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "Destination deactivated successfully" })
  } catch (error) {
    console.error("Error deleting destination:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}