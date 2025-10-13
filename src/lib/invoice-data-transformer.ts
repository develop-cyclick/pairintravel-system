import { prisma } from "./db"
import { PTSystemInvoiceData, InvoiceItem, FlightDetail } from "@/types/invoice"
import { generatePaymentQR } from "./qrcode"
import { format, addDays } from "date-fns"

/**
 * Transform Prisma invoice to PTSystemInvoiceData format
 * Fetches all related data and prepares it for PDF generation
 */
export async function transformInvoiceToPDFData(invoiceId: string): Promise<PTSystemInvoiceData> {
  // Fetch invoice with all related data
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
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
      user: true,
      organization: true
    }
  })

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  // Fetch company settings
  const companySettings = await prisma.companySettings.findUnique({
    where: { organizationId: invoice.organizationId }
  })

  if (!companySettings) {
    throw new Error(`Company settings not found for organization: ${invoice.organizationId}`)
  }

  // Determine invoice type
  const bookings = invoice.purchaseOrder?.bookings || []
  const tourBookings = invoice.purchaseOrder?.tourBookings || []
  const totalPassengers = [
    ...bookings.flatMap(b => b.passengers),
    ...tourBookings.flatMap(t => t.passengers)
  ].length

  const type: "group" | "individual" = totalPassengers > 1 ? "group" : "individual"

  // Build items array
  const items: InvoiceItem[] = []

  // Add flight bookings as items
  for (const booking of bookings) {
    const flightDetails: FlightDetail[] = [
      {
        airline: booking.airline,
        flightNumber: booking.flightNumber,
        departure: booking.origin,
        arrival: booking.destination,
        departureDate: booking.departureDate,
        arrivalDate: booking.departureDate, // Approximate, would need actual arrival time
        class: 'Economy' // Default, would need from booking
      }
    ]

    // Add return flight if exists
    if (booking.returnFlightNumber) {
      flightDetails.push({
        airline: booking.returnAirline || booking.airline,
        flightNumber: booking.returnFlightNumber,
        departure: booking.returnOrigin || booking.destination,
        arrival: booking.returnDestination || booking.origin,
        departureDate: booking.returnDepartureDate || booking.departureDate,
        arrivalDate: booking.returnDepartureDate || booking.departureDate,
        class: 'Economy'
      })
    }

    for (const passenger of booking.passengers) {
      items.push({
        type: "AIR",
        description: `Air Ticket - ${booking.origin} to ${booking.destination}`,
        passengerName: `${passenger.customer.title} ${passenger.customer.firstName} ${passenger.customer.lastName}`,
        flightDetails,
        quantity: 1,
        unitPrice: passenger.individualPrice,
        totalPrice: passenger.individualPrice
      })
    }
  }

  // Add tour bookings as items
  for (const tourBooking of tourBookings) {
    for (const passenger of tourBooking.passengers) {
      items.push({
        type: "TOUR",
        description: `Tour Package - ${tourBooking.tourPackage?.name || 'Tour'}`,
        passengerName: `${passenger.customer.title} ${passenger.customer.firstName} ${passenger.customer.lastName}`,
        tourDetails: {
          packageName: tourBooking.tourPackage?.name || 'Tour Package',
          destination: tourBooking.tourPackage?.destination || '',
          departureDate: tourBooking.departureDate || new Date(),
          returnDate: tourBooking.returnDate || new Date(),
          pickupLocation: tourBooking.pickupLocation,
          pickupTime: tourBooking.pickupTime,
          program: tourBooking.tourProgramDetails
        },
        quantity: 1,
        unitPrice: tourBooking.totalAmount / (tourBooking.passengers.length || 1),
        totalPrice: tourBooking.totalAmount / (tourBooking.passengers.length || 1)
      })
    }
  }

  // Calculate totals
  const subtotal = invoice.amount
  const tax = invoice.tax
  const airportTax = bookings.reduce((sum, b) => sum + (b.airportTax || 0) + (b.returnAirportTax || 0), 0)
  const baggageCharge = bookings.reduce((sum, b) => sum + (b.baggageCharge || 0) + (b.returnBaggageCharge || 0), 0)
  const mealCharge = bookings.reduce((sum, b) => sum + (b.mealCharge || 0) + (b.returnMealCharge || 0), 0)
  const seatSelectionCharge = bookings.reduce((sum, b) => sum + (b.seatSelectionCharge || 0) + (b.returnSeatSelectionCharge || 0), 0)
  const totalAmount = invoice.totalAmount

  // Generate QR code if not already generated
  let qrCode = invoice.qrCode
  if (!qrCode) {
    try {
      qrCode = await generatePaymentQR({
        invoiceNumber: invoice.invoiceNumber,
        amount: totalAmount,
        bookingRef: invoice.purchaseOrder?.poNumber || invoice.invoiceNumber
      })
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      qrCode = undefined
    }
  }

  // Get customer info (department or individual)
  const department = invoice.purchaseOrder?.department
  const customer = invoice.purchaseOrder?.customer

  const invoiceData: PTSystemInvoiceData = {
    type,
    invoiceNumber: invoice.invoiceNumber,
    poNumber: invoice.purchaseOrder?.poNumber || '',
    bcNumber: bookings[0]?.bookingRef || tourBookings[0]?.bookingRef || '',
    docDate: invoice.createdAt,
    creditTerms: department?.paymentTerms || customer?.paymentTerms || 30,
    dueDate: addDays(invoice.createdAt, department?.paymentTerms || customer?.paymentTerms || 30),
    owner: invoice.user?.name || 'System',
    issuer: invoice.user?.name || 'System',

    // Company info
    companyName: companySettings.companyName,
    companyNameTh: companySettings.companyNameTh,
    companyAddress: companySettings.companyAddress,
    companyPhone: companySettings.companyPhone,
    companyEmail: companySettings.companyEmail,
    companyTaxId: companySettings.companyTaxId,

    // Customer info
    customerType: department ? "department" : "individual",
    customerName: department?.nameEn || `${customer?.firstName} ${customer?.lastName}` || 'N/A',
    customerNameTh: department?.nameTh,
    customerAddress: department?.address || '',
    customerTaxId: department?.taxId || '',
    customerPhone: department?.phone || customer?.phone,
    customerEmail: department?.email || customer?.email,

    // Items
    items,

    // Financial
    subtotal,
    tax,
    taxRate: 0.07, // 7% VAT
    airportTax,
    totalAmount,
    serviceFee: invoice.purchaseOrder?.serviceFee || 0,
    amountInWords: convertAmountToWords(totalAmount, 'en'),
    amountInWordsTh: convertAmountToWords(totalAmount, 'th'),

    // Additional charges
    baggageCharge,
    mealCharge,
    seatSelectionCharge,

    // Payment
    paymentMethod: invoice.status === 'PAID' ? 'TRANSFER' : undefined,
    qrCode,

    // Reference numbers
    bookingNumber: invoice.purchaseOrder?.poNumber,
    printingNumber: invoice.invoiceNumber,

    // Remarks
    remarks: [
      'Please verify ticket details and prices before accepting tickets.',
      'Make checks payable to: ' + companySettings.companyName
    ],

    // Footer
    termsTh: 'โปรดตรวจสอบความถูกต้องของตั๋วและราคาก่อนรับตั๋ว',
    receivedBy: invoice.user?.name,

    // Original data
    department: department || undefined,
    customer: customer || undefined,
    bookings: bookings.map(b => ({
      bookingRef: b.bookingRef,
      returnBookingRef: b.returnBookingRef,
      returnFlightNumber: b.returnFlightNumber,
      returnAirline: b.returnAirline,
      totalAmount: b.totalAmount,
      passengers: b.passengers.map(p => p.customer),
      baggageCharge: b.baggageCharge,
      mealCharge: b.mealCharge,
      seatSelectionCharge: b.seatSelectionCharge,
      airportTax: b.airportTax
    })),
    tourBookings: tourBookings.map(t => ({
      tourPackage: t.tourPackage,
      totalAmount: t.totalAmount,
      passengers: t.passengers.map(p => p.customer),
      departureDate: t.departureDate?.toISOString(),
      returnDate: t.returnDate?.toISOString(),
      pickupLocation: t.pickupLocation || undefined,
      pickupTime: t.pickupTime || undefined,
      tourProgramDetails: t.tourProgramDetails || undefined
    })),
    passengers: [
      ...bookings.flatMap(b => b.passengers.map(p => p.customer)),
      ...tourBookings.flatMap(t => t.passengers.map(p => p.customer))
    ]
  }

  return invoiceData
}

/**
 * Convert amount to words in English or Thai
 * Simplified version - you may want to use a library for production
 */
function convertAmountToWords(amount: number, language: 'en' | 'th'): string {
  const rounded = Math.round(amount * 100) / 100
  const [baht, satang] = rounded.toString().split('.')

  if (language === 'en') {
    return `${baht.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} BAHT${satang ? ' AND ' + satang + ' SATANG' : ''} ONLY`
  } else {
    return `${baht.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} บาท${satang ? ' ' + satang + ' สตางค์' : ''}ถ้วน`
  }
}
