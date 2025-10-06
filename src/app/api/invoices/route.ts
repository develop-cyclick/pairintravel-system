import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generatePaymentQR, generatePaymentVerificationQR } from "@/lib/qrcode"
import { createPaymentVerification } from "@/lib/payment-verification"
import { getSessionOrganizationId, verifyOrganizationAccess } from "@/lib/organization"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const where: any = { organizationId }
    if (status) {
      where.status = status
    }

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

    const organizationId = await getSessionOrganizationId()

    const body = await request.json()
    const { purchaseOrderId, bookingId } = body

    if (purchaseOrderId) {
      // New purchase order-based invoice system
      return await createPurchaseOrderInvoice(purchaseOrderId, organizationId, session)
    } else if (bookingId) {
      // Legacy booking-based invoice system
      return await createBookingInvoice(bookingId, organizationId, session)
    } else {
      return NextResponse.json({ error: "Either purchaseOrderId or bookingId is required" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function createPurchaseOrderInvoice(purchaseOrderId: string, organizationId: string, session: any) {
  // Check if invoice already exists
  const existingInvoice = await prisma.invoice.findFirst({
    where: { purchaseOrderId, organizationId }
  })

  if (existingInvoice) {
    return NextResponse.json({ error: "Invoice already exists for this purchase order" }, { status: 400 })
  }

  // Get purchase order details and verify org access
  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: {
      id: purchaseOrderId,
      organizationId
    },
    include: {
      bookings: true,
      tourBookings: true,
      department: true,
      customer: true
    }
  })

  if (!purchaseOrder) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
  }

  // Generate invoice number
  const invoiceNumber = "INV" + Date.now().toString().slice(-8)

  // Calculate airport tax total (not subject to VAT)
  const totalAirportTax = purchaseOrder.bookings.reduce(
    (sum: number, booking: any) => sum + (booking.airportTax || 0),
    0
  )

  // Calculate tax (7% VAT for Thailand)
  // IMPORTANT: Airport tax is NOT subject to VAT
  const taxRate = 0.07
  const amountBeforeTax = purchaseOrder.totalAmount - totalAirportTax
  const tax = amountBeforeTax * taxRate
  const totalAmount = amountBeforeTax + tax + totalAirportTax

  // Store the taxable amount (without airport tax)
  const amount = amountBeforeTax

  // Create invoice first
  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      invoiceNumber,
      purchaseOrderId,
      amount,
      tax,
      totalAmount,
      status: "PENDING",
      userId: session.user.id
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
          }
        }
      }
    }
  })

  // Create payment verification
  const paymentVerification = await createPaymentVerification({
    invoiceId: invoice.id,
    expirationHours: 72 // 3 days
  })

  // Generate payment verification QR code
  const qrCode = await generatePaymentVerificationQR({
    token: paymentVerification.verificationToken,
    invoiceNumber,
    amount: totalAmount,
    expiresAt: paymentVerification.expiresAt
  })

  // Update invoice with QR code
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { qrCode },
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
          }
        }
      }
    }
  })

  return NextResponse.json(updatedInvoice)
}

async function createBookingInvoice(bookingId: string, organizationId: string, session: any) {
  // Check if invoice already exists
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      bookingId,
      organizationId
    }
  })

  if (existingInvoice) {
    return NextResponse.json({ error: "Invoice already exists for this booking" }, { status: 400 })
  }

  // Get booking details and verify org access
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      organizationId
    },
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

  // Create invoice first
  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      invoiceNumber,
      bookingId,
      amount,
      tax,
      totalAmount,
      status: "PENDING",
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

  // Create payment verification
  const paymentVerification = await createPaymentVerification({
    invoiceId: invoice.id,
    expirationHours: 72 // 3 days
  })

  // Generate payment verification QR code
  const qrCode = await generatePaymentVerificationQR({
    token: paymentVerification.verificationToken,
    invoiceNumber,
    amount: totalAmount,
    expiresAt: paymentVerification.expiresAt
  })

  // Update invoice with QR code
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { qrCode },
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

  return NextResponse.json(updatedInvoice)
}