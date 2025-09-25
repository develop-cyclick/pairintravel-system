import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET - Fetch single purchase order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        department: true,
        customer: true,
        bookings: {
          include: {
            passengers: {
              include: {
                customer: true
              }
            }
          }
        },
        tourBookings: {
          include: {
            tourPackage: true,
            passengers: {
              include: {
                customer: true
              }
            }
          }
        },
        invoices: true
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update purchase order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Only allow updating certain fields
    const { status } = body

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        user: true,
        department: true,
        customer: true,
        bookings: {
          include: {
            passengers: {
              include: {
                customer: true
              }
            }
          }
        },
        invoices: true
      }
    })

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete purchase order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if PO has any invoices
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { invoices: true }
    })

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    if (po.invoices.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete purchase order with existing invoices" 
      }, { status: 400 })
    }

    // Delete in transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete related bookings and their passengers
      await tx.bookingPassenger.deleteMany({
        where: {
          booking: {
            purchaseOrderId: params.id
          }
        }
      })

      await tx.booking.deleteMany({
        where: { purchaseOrderId: params.id }
      })

      // Delete tour bookings if any
      await tx.tourPassenger.deleteMany({
        where: {
          tourBooking: {
            purchaseOrderId: params.id
          }
        }
      })

      await tx.tourBooking.deleteMany({
        where: { purchaseOrderId: params.id }
      })

      // Finally delete the purchase order
      await tx.purchaseOrder.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ message: "Purchase order deleted successfully" })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}