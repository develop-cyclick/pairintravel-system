import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generatePaymentQR } from "@/lib/qrcode"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const where = status ? { status } : {}

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
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
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.invoice.count({ where })
    ])

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId } = body

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { bookingId }
    })

    if (existingInvoice) {
      return NextResponse.json({ error: "Invoice already exists for this booking" }, { status: 400 })
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        flight: true,
        passengers: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Generate invoice number
    const invoiceNumber = "INV" + Date.now().toString().slice(-8)

    // Calculate tax (7% VAT for Thailand)
    const taxRate = 0.07
    const amount = booking.totalAmount
    const tax = amount * taxRate
    const totalAmount = amount + tax

    // Generate QR code
    const qrCode = await generatePaymentQR({
      invoiceNumber,
      amount: totalAmount,
      bookingRef: booking.bookingRef
    })

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        amount,
        tax,
        totalAmount,
        status: "PENDING",
        qrCode,
        userId: session.user.id
      },
      include: {
        booking: {
          include: {
            flight: true,
            passengers: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}