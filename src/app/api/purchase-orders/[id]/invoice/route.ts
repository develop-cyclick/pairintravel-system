import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import QRCode from "qrcode"

// Generate invoice number
function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `INV-${year}-${month}-${random}`
}

// Generate payment QR code
async function generatePaymentQR(invoiceData: {
  invoiceNumber: string
  amount: number
  poNumber: string
}): Promise<string> {
  const paymentData = {
    type: "PAYMENT",
    invoice: invoiceData.invoiceNumber,
    amount: invoiceData.amount,
    poNumber: invoiceData.poNumber,
    timestamp: new Date().toISOString(),
  }

  return await QRCode.toDataURL(JSON.stringify(paymentData))
}

// POST - Create invoice for purchase order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      // Try finding by email as fallback
      const userByEmail = session.user.email ? 
        await prisma.user.findUnique({ where: { email: session.user.email } }) : 
        null
      
      if (!userByEmail) {
        return NextResponse.json({ 
          error: "Session expired. Please log out and log in again." 
        }, { status: 401 })
      }
    }

    const userId = user?.id || session.user.id

    // Get purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        invoices: true,
        bookings: true,
        tourBookings: true
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    // Check if invoice already exists for this PO
    if (purchaseOrder.invoices.length > 0) {
      return NextResponse.json({ 
        error: "Invoice already exists for this purchase order",
        invoice: purchaseOrder.invoices[0]
      }, { status: 400 })
    }

    // Calculate tax (7% VAT)
    const taxRate = 0.07
    const tax = purchaseOrder.totalAmount * taxRate
    const totalAmountWithTax = purchaseOrder.totalAmount + tax

    // Generate invoice number and QR code
    const invoiceNumber = generateInvoiceNumber()
    const qrCode = await generatePaymentQR({
      invoiceNumber,
      amount: totalAmountWithTax,
      poNumber: purchaseOrder.poNumber
    })

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        purchaseOrderId: purchaseOrder.id,
        amount: purchaseOrder.totalAmount,
        tax,
        totalAmount: totalAmountWithTax,
        status: "PENDING",
        qrCode,
        userId
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
        },
        user: true
      }
    })

    return NextResponse.json({
      message: "Invoice created successfully",
      invoice
    })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}