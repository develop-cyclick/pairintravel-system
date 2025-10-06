import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSessionOrganizationId, verifyOrganizationAccess } from "@/lib/organization"

// GET - Fetch single purchase order
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

    const organizationId = await getSessionOrganizationId()

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
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
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify organization access
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      select: { organizationId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    await verifyOrganizationAccess(existing.organizationId)

    const body = await request.json()
    const { status, purpose, approvalRef, bookings } = body

    // Start a transaction to update PO and related bookings
    const result = await prisma.$transaction(async (tx) => {
      // Update bookings if provided
      if (bookings && Array.isArray(bookings)) {
        for (const bookingUpdate of bookings) {
          const {
            bookingId,
            flightNumber,
            airline,
            origin,
            destination,
            departureDate,
            costPerPassenger,
            serviceFeePerPassenger,
            passengerCount,
            baggageCharge,
            mealCharge,
            seatSelectionCharge,
            airportTax
          } = bookingUpdate

          // Validate required fields
          if (!bookingId || costPerPassenger === undefined || serviceFeePerPassenger === undefined) {
            throw new Error("Missing required booking fields")
          }

          // Calculate pricing
          const basePrice = costPerPassenger + serviceFeePerPassenger
          const totalCost = costPerPassenger * passengerCount
          const totalServiceFee = serviceFeePerPassenger * passengerCount
          // Include all additional charges in totalAmount
          const totalAmount = (basePrice * passengerCount) +
                             (baggageCharge || 0) +
                             (mealCharge || 0) +
                             (seatSelectionCharge || 0) +
                             (airportTax || 0)

          // Update booking
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              flightNumber: flightNumber || undefined,
              airline: airline || undefined,
              origin: origin || undefined,
              destination: destination || undefined,
              departureDate: departureDate ? new Date(departureDate) : undefined,
              basePrice,
              totalCost,
              totalServiceFee,
              baggageCharge: baggageCharge !== undefined ? baggageCharge : undefined,
              mealCharge: mealCharge !== undefined ? mealCharge : undefined,
              seatSelectionCharge: seatSelectionCharge !== undefined ? seatSelectionCharge : undefined,
              airportTax: airportTax !== undefined ? airportTax : undefined,
              totalAmount,
              updatedAt: new Date()
            }
          })

          // Update individual passenger pricing
          const passengers = await tx.bookingPassenger.findMany({
            where: { bookingId }
          })

          for (const passenger of passengers) {
            await tx.bookingPassenger.update({
              where: { id: passenger.id },
              data: {
                individualPrice: basePrice,
                individualCost: costPerPassenger,
                individualServiceFee: serviceFeePerPassenger
              }
            })
          }
        }
      }

      // Calculate new PO totals
      const updatedBookings = await tx.booking.findMany({
        where: { purchaseOrderId: params.id }
      })

      const totalAmount = updatedBookings.reduce((sum, b) => sum + b.totalAmount, 0)
      const cost = updatedBookings.reduce((sum, b) => sum + b.totalCost, 0)
      const serviceFee = updatedBookings.reduce((sum, b) => sum + b.totalServiceFee, 0)
      const totalAirportTax = updatedBookings.reduce((sum, b) => sum + (b.airportTax || 0), 0)
      // New profit formula: Total Amount - Total Cost + Airport Tax
      const profit = totalAmount - cost + totalAirportTax

      // Update purchase order
      const purchaseOrder = await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          status: status || undefined,
          purpose: purpose || undefined,
          approvalRef: approvalRef || undefined,
          totalAmount,
          cost,
          serviceFee,
          profit,
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

      return purchaseOrder
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete purchase order
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if PO has any invoices and verify organization access
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { invoices: true },
      select: { id: true, organizationId: true, invoices: true }
    })

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    // Verify organization access
    await verifyOrganizationAccess(po.organizationId)

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