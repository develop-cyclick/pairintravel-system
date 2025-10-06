import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateInvoicePreviewHTML } from "@/lib/invoice-preview"
import { getSessionOrganizationId } from "@/lib/organization"

// Convert number to words for Thai invoice
function convertNumberToWords(amount: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']

  const convertLessThanThousand = (num: number): string => {
    if (num === 0) return ''

    if (num < 10) return ones[num]
    if (num < 20) return teens[num - 10]
    if (num < 100) {
      const ten = Math.floor(num / 10)
      const one = num % 10
      return tens[ten] + (one > 0 ? '-' + ones[one] : '')
    }

    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    return ones[hundred] + ' hundred' + (remainder > 0 ? ' and ' + convertLessThanThousand(remainder) : '')
  }

  if (amount === 0) return 'zero baht'

  const baht = Math.floor(amount)
  const satang = Math.round((amount - baht) * 100)

  let words = ''

  // Convert millions
  if (baht >= 1000000) {
    const millions = Math.floor(baht / 1000000)
    words += convertLessThanThousand(millions) + ' million '
  }

  // Convert thousands
  const thousands = Math.floor((baht % 1000000) / 1000)
  if (thousands > 0) {
    words += convertLessThanThousand(thousands) + ' thousand '
  }

  // Convert hundreds
  const hundreds = baht % 1000
  if (hundreds > 0) {
    words += convertLessThanThousand(hundreds)
  }

  words = words.trim() + ' baht'

  // Add satang if present
  if (satang > 0) {
    words += ' and ' + convertLessThanThousand(satang) + ' satang'
  }

  return words.charAt(0).toUpperCase() + words.slice(1)
}

// POST - Generate HTML for client-side printing
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
    const { type, passengerIds, billTo, showTravelDetails, flightSelection } = body

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

    // Generate HTML based on type
    let invoices: Array<{ html: string; invoiceNumber: string }> = []

    if (type === "group") {
      // Generate single group invoice HTML
      const invoiceData = await generateGroupInvoiceHTML(invoice, { billTo, showTravelDetails, flightSelection })
      invoices.push(invoiceData)
    } else if (type === "individual" && passengerIds && passengerIds.length > 0) {
      // Generate individual invoice HTML for selected passengers
      const allPassengers = getAllPassengers(invoice.purchaseOrder)
      const selectedPassengers = allPassengers.filter(p => passengerIds.includes(p.id))

      for (const passenger of selectedPassengers) {
        const invoiceData = await generateIndividualInvoiceHTML(invoice, passenger, { billTo, showTravelDetails, flightSelection })
        invoices.push(invoiceData)
      }
    } else {
      return NextResponse.json({ error: "Invalid print type or no passengers selected" }, { status: 400 })
    }

    // Return HTML content for client-side printing
    if (invoices.length === 1) {
      return NextResponse.json({
        message: "Invoice HTML generated successfully",
        html: invoices[0].html,
        invoiceNumber: invoices[0].invoiceNumber,
        type
      })
    } else {
      // Combine multiple invoices into single HTML document
      const combinedHTML = combineInvoicesHTML(invoices)

      return NextResponse.json({
        message: "Invoice HTML generated successfully",
        html: combinedHTML,
        invoiceNumbers: invoices.map(inv => inv.invoiceNumber),
        combined: true,
        count: invoices.length,
        type
      })
    }
  } catch (error) {
    console.error("Error generating invoice HTML:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Combine multiple invoice HTMLs into single document with page breaks
function combineInvoicesHTML(invoices: Array<{ html: string; invoiceNumber: string }>): string {
  // Extract the body content from each invoice HTML
  const invoiceBodies = invoices.map((invoice, index) => {
    // Extract content between <body> and </body>
    const bodyMatch = invoice.html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    let bodyContent = bodyMatch ? bodyMatch[1] : invoice.html

    // Add page break class except for the last invoice
    const pageBreakClass = index < invoices.length - 1 ? ' invoice-page-break' : ''

    // Wrap each invoice in a container with page break
    return `
      <div class="invoice-wrapper${pageBreakClass}" data-invoice-number="${invoice.invoiceNumber}">
        ${bodyContent}
      </div>
    `
  }).join('\n')

  // Extract styles and scripts from the first invoice (they should be the same)
  const firstHTML = invoices[0].html
  const headMatch = firstHTML.match(/<head[^>]*>([\s\S]*)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''

  // Build combined HTML document
  return `
<!DOCTYPE html>
<html lang="en">
<head>
${headContent}
  <style>
    /* Additional styles for multiple invoices */
    .invoice-wrapper {
      position: relative;
      margin-bottom: 20px;
    }

    /* CSS for page break after each invoice except the last */
    @media print {
      .invoice-page-break {
        page-break-after: always;
        break-after: always;
      }

      /* Ensure each invoice starts on a new page */
      .invoice-wrapper {
        page-break-inside: avoid;
      }

      /* Hide page margins between invoices */
      .invoice-wrapper:not(:first-child) {
        margin-top: 0;
      }
    }

    /* Screen view - add visual separator */
    @media screen {
      .invoice-wrapper {
        border-bottom: 3px dashed #e5e7eb;
        padding-bottom: 40px;
        margin-bottom: 40px;
      }

      .invoice-wrapper:last-child {
        border-bottom: none;
      }

      /* Page indicator for screen view */
      .invoice-wrapper::before {
        content: attr(data-invoice-number);
        position: absolute;
        top: -30px;
        right: 20px;
        background: #6b7280;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }
    }
  </style>
</head>
<body>
  <div class="combined-invoices-container">
    ${invoiceBodies}
  </div>

  <script>
    // Auto-print on load if opened in new window
    if (window.opener || window.parent !== window) {
      window.addEventListener('load', () => {
        // Give fonts time to load
        setTimeout(() => {
          window.print();

          // Optional: Close window after printing
          window.addEventListener('afterprint', () => {
            // Give user time to save/cancel
            setTimeout(() => {
              if (window.opener) {
                window.close();
              }
            }, 1000);
          });
        }, 1000);
      });
    }
  </script>
</body>
</html>
  `.trim()
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

// Generate group invoice HTML
async function generateGroupInvoiceHTML(
  invoice: any,
  options?: { billTo?: "department" | "passenger" | "none"; showTravelDetails?: boolean; flightSelection?: "all" | "outbound" | "return" }
) {
  const passengers = getAllPassengers(invoice.purchaseOrder)

  // Apply advanced print options
  const billTo = options?.billTo ?? "department"
  const showTravelDetails = options?.showTravelDetails ?? true
  const flightSelection = options?.flightSelection ?? "all"

  const invoiceData = {
    type: "group" as const,
    invoiceNumber: invoice.invoiceNumber,
    poNumber: invoice.purchaseOrder.poNumber,
    totalAmount: invoice.totalAmount,
    tax: invoice.tax,
    amount: invoice.amount,
    qrCode: invoice.qrCode,
    createdAt: invoice.createdAt,
    department: billTo === "department" ? invoice.purchaseOrder.department : undefined,
    customer: billTo === "passenger" ? invoice.purchaseOrder.customer : undefined,
    bookings: showTravelDetails ? invoice.purchaseOrder.bookings : undefined,
    tourBookings: showTravelDetails ? invoice.purchaseOrder.tourBookings : undefined,
    passengers,
    bookingRef: invoice.purchaseOrder.bookings?.[0]?.bookingRef || "",
    // Additional fields for PT System templates
    bcNumber: `BC${Date.now()}`,
    docDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    creditTerms: 7,
    owner: "PT System",
    issuer: invoice.user?.name || invoice.user?.email || "System",
    // Company Info
    companyName: "PT System Co., Ltd.",
    companyNameTh: "บริษัท พีที ซิสเต็ม จำกัด",
    companyAddress: "Bangkok, Thailand",
    companyPhone: "02-XXX-XXXX",
    companyEmail: "info@ptsystem.com",
    companyTaxId: "0105561213350",
    // Customer Info
    customerName: invoice.purchaseOrder.department?.nameEn ||
                  `${invoice.purchaseOrder.customer?.firstName} ${invoice.purchaseOrder.customer?.lastName}`,
    customerNameTh: invoice.purchaseOrder.department?.nameTh,
    customerAddress: invoice.purchaseOrder.department?.address || "1032 Phahonyothin Road, Bangkok",
    customerTaxId: invoice.purchaseOrder.department?.taxId || "0-1234-56789-12-3",
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
    remarks: ["Payment due within 7 days", "Thank you for your business"],
    // Additional required fields
    customerType: "PERSON" as const,
    taxRate: 7,
    amountInWords: convertNumberToWords(invoice.totalAmount)
  }

  // Generate HTML using the preview template
  const html = await generateInvoicePreviewHTML(invoiceData)

  return { html, invoiceNumber: invoice.invoiceNumber }
}

// Generate individual invoice HTML
async function generateIndividualInvoiceHTML(
  invoice: any,
  passenger: any,
  options?: { billTo?: "department" | "passenger" | "none"; showTravelDetails?: boolean; flightSelection?: "all" | "outbound" | "return" }
) {
  // Calculate individual amount (total divided by number of passengers)
  const totalPassengers = getAllPassengers(invoice.purchaseOrder).length
  const individualAmount = invoice.amount / totalPassengers
  const individualTax = invoice.tax / totalPassengers
  const individualTotal = invoice.totalAmount / totalPassengers

  const invoiceNumber = `${invoice.invoiceNumber}-${passenger.id.slice(-6).toUpperCase()}`

  // Apply advanced print options
  const billTo = options?.billTo ?? "passenger"
  const showTravelDetails = options?.showTravelDetails ?? true
  const flightSelection = options?.flightSelection ?? "all"

  const invoiceData = {
    type: "individual" as const,
    invoiceNumber,
    poNumber: invoice.purchaseOrder.poNumber,
    totalAmount: individualTotal,
    tax: individualTax,
    amount: individualAmount,
    qrCode: invoice.qrCode,
    createdAt: invoice.createdAt,
    passenger: billTo === "passenger" ? passenger.customer : undefined,
    department: billTo === "department" ? invoice.purchaseOrder.department : undefined,
    mainCustomer: invoice.purchaseOrder.customer,
    bookingRef: invoice.purchaseOrder.bookings?.[0]?.bookingRef || "",
    // Additional fields for PT System templates
    bcNumber: `BC${Date.now()}`,
    docDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    creditTerms: 7,
    owner: "PT System",
    issuer: invoice.user?.name || invoice.user?.email || "System",
    // Company Info
    companyName: "PT System Co., Ltd.",
    companyNameTh: "บริษัท พีที ซิสเต็ม จำกัด",
    companyAddress: "Bangkok, Thailand",
    companyPhone: "02-XXX-XXXX",
    companyEmail: "info@ptsystem.com",
    companyTaxId: "0105561213350",
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
    remarks: ["Payment due within 7 days", "Individual invoice"],
    // Additional required fields
    customerType: "PERSON" as const,
    taxRate: 7,
    amountInWords: convertNumberToWords(individualTotal)
  }

  // Generate HTML using the preview template
  const html = await generateInvoicePreviewHTML(invoiceData)

  return { html, invoiceNumber }
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