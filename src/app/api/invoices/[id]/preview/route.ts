import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateInvoicePreviewHTML } from "@/lib/invoice-preview"
import { getCompanySettings } from "@/lib/company-settings"
import { getSessionOrganizationId } from "@/lib/organization"

// POST - Generate invoice preview
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()
    const { id } = await params
    const body = await request.json()
    const { type, passengerIds, format = "html" } = body

    // Fetch invoice with all related data (filtered by organization)
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId
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
                },
                flight: true
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

    // Generate preview based on type
    let previews: Array<{ html: string; metadata: any }> = []

    if (type === "group") {
      // Generate single group invoice preview
      const previewData = await generateGroupInvoicePreview(invoice, format)
      previews.push(previewData)
    } else if (type === "individual" && passengerIds && passengerIds.length > 0) {
      // Generate individual invoice previews for selected passengers
      const allPassengers = getAllPassengers(invoice.purchaseOrder)
      const selectedPassengers = allPassengers.filter(p => passengerIds.includes(p.id))

      for (const passenger of selectedPassengers) {
        const previewData = await generateIndividualInvoicePreview(invoice, passenger, format)
        previews.push(previewData)
      }
    } else {
      // Default to group invoice if no type specified
      const previewData = await generateGroupInvoicePreview(invoice, format)
      previews.push(previewData)
    }

    return NextResponse.json({
      message: "Preview generated successfully",
      previews,
      type: type || "group"
    })
  } catch (error) {
    console.error("Error generating invoice preview:", error)
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

// Generate group invoice preview
async function generateGroupInvoicePreview(invoice: any, format: string) {
  const passengers = getAllPassengers(invoice.purchaseOrder)

  // Fetch company settings from database
  const companySettings = await getCompanySettings()

  const previewData = {
    type: "group" as const,
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
    passengers,
    bookingRef: invoice.purchaseOrder.bookings?.[0]?.bookingRef || "",
    // Additional PT System fields
    bcNumber: `BC${Date.now()}`,
    docDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    creditTerms: 7,
    owner: "PT System",
    issuer: invoice.user?.name || invoice.user?.email || "System",
    // Company Info from settings
    companyName: companySettings.companyName,
    companyNameTh: companySettings.companyNameTh,
    companyAddress: companySettings.companyAddress,
    companyPhone: companySettings.companyPhone,
    companyEmail: companySettings.companyEmail,
    companyTaxId: companySettings.companyTaxId,
    // Customer Info
    customerName: invoice.purchaseOrder.department?.nameEn ||
                  `${invoice.purchaseOrder.customer?.firstName} ${invoice.purchaseOrder.customer?.lastName}`,
    customerNameTh: invoice.purchaseOrder.department?.nameTh,
    customerAddress: invoice.purchaseOrder.department?.address || "",
    customerTaxId: invoice.purchaseOrder.department?.taxId,
    customerPhone: invoice.purchaseOrder.department?.phone || invoice.purchaseOrder.customer?.phone,
    customerEmail: invoice.purchaseOrder.department?.email || invoice.purchaseOrder.customer?.email,
    // Financial
    subtotal: invoice.amount,
    airportTax: 0,
    baggageCharge: 0,
    mealCharge: 0,
    seatSelectionCharge: 0,
    // Items
    items: prepareInvoiceItems(invoice.purchaseOrder),
    // Payment
    paymentMethod: invoice.paymentMethod,
    // Footer
    remarks: ["Payment due within 7 days", "Thank you for your business"]
  }

  const html = await generateInvoicePreviewHTML(previewData)

  return {
    html,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      passengerCount: passengers.length,
      type: "group"
    }
  }
}

// Generate individual invoice preview
async function generateIndividualInvoicePreview(invoice: any, passenger: any, format: string) {
  // Calculate individual amount (total divided by number of passengers)
  const totalPassengers = getAllPassengers(invoice.purchaseOrder).length
  const individualAmount = invoice.amount / totalPassengers
  const individualTax = invoice.tax / totalPassengers
  const individualTotal = invoice.totalAmount / totalPassengers

  // Fetch company settings from database
  const companySettings = await getCompanySettings()

  const previewData = {
    type: "individual" as const,
    invoiceNumber: `${invoice.invoiceNumber}-${passenger.id.slice(-6).toUpperCase()}`,
    poNumber: invoice.purchaseOrder.poNumber,
    totalAmount: individualTotal,
    tax: individualTax,
    amount: individualAmount,
    qrCode: invoice.qrCode,
    createdAt: invoice.createdAt,
    passenger: passenger.customer,
    department: invoice.purchaseOrder.department,
    mainCustomer: invoice.purchaseOrder.customer,
    bookingRef: invoice.purchaseOrder.bookings?.[0]?.bookingRef || "",
    // Additional PT System fields
    bcNumber: `BC${Date.now()}`,
    docDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    creditTerms: 7,
    owner: "PT System",
    issuer: invoice.user?.name || invoice.user?.email || "System",
    // Company Info from settings
    companyName: companySettings.companyName,
    companyNameTh: companySettings.companyNameTh,
    companyAddress: companySettings.companyAddress,
    companyPhone: companySettings.companyPhone,
    companyEmail: companySettings.companyEmail,
    companyTaxId: companySettings.companyTaxId,
    // Customer Info (individual passenger)
    customerName: `${passenger.customer.title} ${passenger.customer.firstName} ${passenger.customer.lastName}`,
    customerNameTh: "",
    customerAddress: "",
    customerTaxId: passenger.customer.nationalId,
    customerPhone: passenger.customer.phone,
    customerEmail: passenger.customer.email,
    // Financial
    subtotal: individualAmount,
    airportTax: 0,
    baggageCharge: 0,
    mealCharge: 0,
    seatSelectionCharge: 0,
    // Items (filtered for this passenger)
    items: prepareIndividualInvoiceItems(invoice.purchaseOrder, passenger, individualAmount),
    // Payment
    paymentMethod: invoice.paymentMethod,
    // Footer
    remarks: ["Payment due within 7 days", "Individual invoice"]
  }

  const html = await generateInvoicePreviewHTML(previewData)

  return {
    html,
    metadata: {
      invoiceNumber: previewData.invoiceNumber,
      totalAmount: individualTotal,
      passengerName: `${passenger.customer.firstName} ${passenger.customer.lastName}`,
      type: "individual"
    }
  }
}

// Prepare invoice items for group invoice
function prepareInvoiceItems(purchaseOrder: any) {
  const items: any[] = []

  // Add flight bookings as items
  if (purchaseOrder.bookings) {
    purchaseOrder.bookings.forEach((booking: any) => {
      items.push({
        type: "FLIGHT",
        description: `Flight Booking - ${booking.bookingRef}`,
        flightDetails: booking.flight ? [{
          airline: booking.flight.airline,
          flightNumber: booking.flight.flightNumber,
          departure: booking.flight.origin,
          arrival: booking.flight.destination,
          departureDate: booking.flight.departureTime,
          arrivalDate: booking.flight.arrivalTime
        }] : [],
        quantity: booking.passengers?.length || 1,
        unitPrice: booking.totalAmount / (booking.passengers?.length || 1),
        totalPrice: booking.totalAmount
      })
    })
  }

  // Add tour bookings as items
  if (purchaseOrder.tourBookings) {
    purchaseOrder.tourBookings.forEach((booking: any) => {
      items.push({
        type: "TOUR",
        description: booking.tourPackage?.name || "Tour Package",
        quantity: booking.passengers?.length || 1,
        unitPrice: booking.totalAmount / (booking.passengers?.length || 1),
        totalPrice: booking.totalAmount
      })
    })
  }

  return items
}

// Prepare invoice items for individual invoice
function prepareIndividualInvoiceItems(purchaseOrder: any, passenger: any, amount: number) {
  const items: any[] = []

  // Check if passenger is in any flight booking
  if (purchaseOrder.bookings) {
    purchaseOrder.bookings.forEach((booking: any) => {
      const hasPassenger = booking.passengers?.some((p: any) => p.id === passenger.id)
      if (hasPassenger) {
        const passengerCount = booking.passengers.length
        items.push({
          type: "FLIGHT",
          description: `Flight Booking - ${booking.bookingRef}`,
          passengerName: `${passenger.customer.firstName} ${passenger.customer.lastName}`,
          flightDetails: booking.flight ? [{
            airline: booking.flight.airline,
            flightNumber: booking.flight.flightNumber,
            departure: booking.flight.origin,
            arrival: booking.flight.destination,
            departureDate: booking.flight.departureTime,
            arrivalDate: booking.flight.arrivalTime
          }] : [],
          quantity: 1,
          unitPrice: booking.totalAmount / passengerCount,
          totalPrice: booking.totalAmount / passengerCount
        })
      }
    })
  }

  // Check if passenger is in any tour booking
  if (purchaseOrder.tourBookings) {
    purchaseOrder.tourBookings.forEach((booking: any) => {
      const hasPassenger = booking.passengers?.some((p: any) => p.id === passenger.id)
      if (hasPassenger) {
        const passengerCount = booking.passengers.length
        items.push({
          type: "TOUR",
          description: booking.tourPackage?.name || "Tour Package",
          passengerName: `${passenger.customer.firstName} ${passenger.customer.lastName}`,
          quantity: 1,
          unitPrice: booking.totalAmount / passengerCount,
          totalPrice: booking.totalAmount / passengerCount
        })
      }
    })
  }

  return items
}