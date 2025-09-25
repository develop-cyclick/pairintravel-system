import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        purchaseOrder: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Invoice already paid" }, { status: 400 })
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: "PAID",
        paidAt: new Date()
      },
      include: {
        purchaseOrder: {
          include: {
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
            }
          }
        }
      }
    })

    // Update purchase order status to COMPLETED
    if (updatedInvoice.purchaseOrder.status !== "COMPLETED") {
      await prisma.purchaseOrder.update({
        where: { id: updatedInvoice.purchaseOrderId },
        data: { status: "COMPLETED" }
      })
    }

    return NextResponse.json({
      message: "Payment confirmed successfully",
      invoice: updatedInvoice
    })
  } catch (error) {
    console.error("Error confirming payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}