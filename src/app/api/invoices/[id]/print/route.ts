import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateInvoicePDFWithFallback } from "@/lib/htmldocs-render"

// POST - Generate PDF invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, passengerIds } = body

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
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
        },
        user: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Generate PDFs based on type
    let pdfUrls: string[] = []

    if (type === "group") {
      // Generate single group invoice
      const pdfData = await generateGroupInvoicePDF(invoice)
      pdfUrls.push(pdfData.url)
    } else if (type === "individual" && passengerIds && passengerIds.length > 0) {
      // Generate individual invoices for selected passengers
      const allPassengers = getAllPassengers(invoice.purchaseOrder)
      const selectedPassengers = allPassengers.filter(p => passengerIds.includes(p.id))
      
      for (const passenger of selectedPassengers) {
        const pdfData = await generateIndividualInvoicePDF(invoice, passenger)
        pdfUrls.push(pdfData.url)
      }
    } else {
      return NextResponse.json({ error: "Invalid print type or no passengers selected" }, { status: 400 })
    }

    // Store PDF URLs in database if needed
    if (pdfUrls.length === 1 && type === "group") {
      await prisma.invoice.update({
        where: { id: params.id },
        data: { pdfUrl: pdfUrls[0] }
      })
    }

    return NextResponse.json({
      message: "Invoice(s) generated successfully",
      pdfUrls,
      type
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get all passengers
function getAllPassengers(purchaseOrder: any) {
  const passengers: any[] = []
  
  if (purchaseOrder.bookings) {
    purchaseOrder.bookings.forEach((booking: any) => {
      if (booking.passengers) {
        passengers.push(...booking.passengers)
      }
    })
  }
  
  if (purchaseOrder.tourBookings) {
    purchaseOrder.tourBookings.forEach((booking: any) => {
      if (booking.passengers) {
        passengers.push(...booking.passengers)
      }
    })
  }
  
  return passengers
}

// Generate group invoice PDF
async function generateGroupInvoicePDF(invoice: any) {
  const pdfData = {
    type: "group",
    invoiceNumber: invoice.invoiceNumber,
    poNumber: invoice.purchaseOrder.poNumber,
    totalAmount: invoice.totalAmount,
    tax: invoice.tax,
    amount: invoice.amount,
    qrCode: invoice.qrCode,
    createdAt: invoice.createdAt,
    department: invoice.purchaseOrder.department,
    customer: invoice.purchaseOrder.customer,
    bookings: invoice.purchaseOrder.bookings,
    tourBookings: invoice.purchaseOrder.tourBookings,
    passengers: getAllPassengers(invoice.purchaseOrder)
  }

  // Use HTMLDocs with fallback to jsPDF (PT System format)
  const fullData = {
    ...pdfData,
    bookingRef: invoice.purchaseOrder.bookings?.[0]?.bookingRef || ""
  }
  const pdfUrl = await generateInvoicePDFWithFallback(fullData, true)
  
  return { url: pdfUrl }
}

// Generate individual invoice PDF
async function generateIndividualInvoicePDF(invoice: any, passenger: any) {
  // Calculate individual amount (total divided by number of passengers)
  const totalPassengers = getAllPassengers(invoice.purchaseOrder).length
  const individualAmount = invoice.amount / totalPassengers
  const individualTax = invoice.tax / totalPassengers
  const individualTotal = invoice.totalAmount / totalPassengers

  const pdfData = {
    type: "individual",
    invoiceNumber: `${invoice.invoiceNumber}-${passenger.id.slice(-6).toUpperCase()}`,
    poNumber: invoice.purchaseOrder.poNumber,
    totalAmount: individualTotal,
    tax: individualTax,
    amount: individualAmount,
    qrCode: invoice.qrCode,
    createdAt: invoice.createdAt,
    passenger: passenger.customer,
    department: invoice.purchaseOrder.department,
    mainCustomer: invoice.purchaseOrder.customer
  }

  // Use HTMLDocs with fallback to jsPDF (PT System format)
  const fullData = {
    ...pdfData,
    bookingRef: invoice.purchaseOrder.bookings?.[0]?.bookingRef || ""
  }
  const pdfUrl = await generateInvoicePDFWithFallback(fullData, true)
  
  return { url: pdfUrl }
}