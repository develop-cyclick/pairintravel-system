import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSessionOrganizationId, verifyOrganizationAccess } from "@/lib/organization"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()

    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        flight: true,
        user: true,
        passengers: {
          include: {
            customer: true
          }
        },
        invoice: true,
        department: true,
        rescheduleHistory: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Error fetching booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the booking belongs to user's organization
    const existing = await prisma.booking.findUnique({
      where: { id: params.id },
      select: { organizationId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    await verifyOrganizationAccess(existing.organizationId)

    const body = await request.json()
    const { status, type, departmentId } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (type !== undefined) updateData.type = type
    if (departmentId !== undefined) updateData.departmentId = departmentId

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        flight: true,
        passengers: {
          include: {
            customer: true
          }
        },
        department: true
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Error updating booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { flight: true, passengers: true },
      select: { id: true, flightId: true, organizationId: true, passengers: true }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Verify the booking belongs to user's organization
    await verifyOrganizationAccess(booking.organizationId)

    // Return seats to flight if booking has a flight
    if (booking.flightId) {
      await prisma.flight.update({
        where: { id: booking.flightId },
        data: {
          availableSeats: {
            increment: booking.passengers.length
          }
        }
      })
    }

    // Delete booking (cascades to passengers)
    await prisma.booking.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Booking deleted successfully" })
  } catch (error) {
    console.error("Error deleting booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}