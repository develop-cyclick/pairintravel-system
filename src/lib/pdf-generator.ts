import jsPDF from "jspdf"
import { format } from "date-fns"
import { addThaiFont, renderThaiText, containsThaiCharacters } from "./pdf-thai-font"

interface InvoiceData {
  type: "group" | "individual"
  invoiceNumber: string
  poNumber: string
  totalAmount: number
  tax: number
  amount: number
  qrCode?: string
  createdAt: Date
  department?: any
  customer?: any
  mainCustomer?: any
  passenger?: any
  bookings?: any[]
  tourBookings?: any[]
  passengers?: any[]
}

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  // Add Thai font support
  addThaiFont(doc)

  // Set fonts
  doc.setFont("helvetica")
  
  // Header
  doc.setFontSize(20)
  doc.text("INVOICE", 105, 20, { align: "center" })
  
  // Invoice type badge
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(data.type === "group" ? "GROUP INVOICE" : "INDIVIDUAL INVOICE", 105, 28, { align: "center" })
  doc.setTextColor(0)
  
  // Invoice details
  doc.setFontSize(12)
  doc.text(`Invoice Number: ${data.invoiceNumber}`, 20, 45)
  doc.text(`PO Number: ${data.poNumber}`, 20, 52)
  doc.text(`Date: ${format(new Date(data.createdAt), "dd MMM yyyy")}`, 20, 59)
  
  // Billing To section
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("BILL TO:", 20, 75)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  
  let yPos = 82
  
  if (data.type === "group") {
    // Group invoice - show department or customer
    if (data.department) {
      doc.text(data.department.nameEn, 20, yPos)
      if (data.department.nameTh) {
        renderThaiText(doc, data.department.nameTh, 20, yPos + 6)
      }
      doc.text(`Code: ${data.department.code}`, 20, yPos + 12)
      if (data.department.phone) doc.text(`Phone: ${data.department.phone}`, 20, yPos + 18)
      if (data.department.email) doc.text(`Email: ${data.department.email}`, 20, yPos + 24)
    } else if (data.customer) {
      doc.text(`${data.customer.firstName} ${data.customer.lastName}`, 20, yPos)
      doc.text(`Email: ${data.customer.email}`, 20, yPos + 6)
      if (data.customer.phone) doc.text(`Phone: ${data.customer.phone}`, 20, yPos + 12)
    }
  } else {
    // Individual invoice - show passenger details
    if (data.passenger) {
      doc.text(`${data.passenger.title} ${data.passenger.firstName} ${data.passenger.lastName}`, 20, yPos)
      doc.text(`Email: ${data.passenger.email}`, 20, yPos + 6)
      if (data.passenger.phone) doc.text(`Phone: ${data.passenger.phone}`, 20, yPos + 12)
      if (data.passenger.passportNo) doc.text(`Passport: ${data.passenger.passportNo}`, 20, yPos + 18)
      if (data.passenger.nationalId) doc.text(`National ID: ${data.passenger.nationalId}`, 20, yPos + 24)
    }
    
    // Show main customer/department info
    yPos += 35
    doc.setFontSize(10)
    doc.setTextColor(100)
    if (data.department) {
      doc.text(`Organization: ${data.department.nameEn}`, 20, yPos)
    } else if (data.mainCustomer) {
      doc.text(`Main Contact: ${data.mainCustomer.firstName} ${data.mainCustomer.lastName}`, 20, yPos)
    }
    doc.setTextColor(0)
  }
  
  // Items table
  yPos = 120
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  
  // Table header
  doc.line(20, yPos, 190, yPos)
  yPos += 7
  doc.text("Description", 25, yPos)
  doc.text("Amount", 160, yPos, { align: "right" })
  yPos += 3
  doc.line(20, yPos, 190, yPos)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  yPos += 7
  
  if (data.type === "group") {
    // List all bookings
    if (data.bookings && data.bookings.length > 0) {
      doc.text("Flight Bookings:", 25, yPos)
      yPos += 6
      data.bookings.forEach((booking, index) => {
        doc.setFontSize(10)
        doc.text(`  ${index + 1}. Booking Ref: ${booking.bookingRef}`, 30, yPos)
        renderThaiText(doc, `฿${booking.totalAmount?.toLocaleString() || "0"}`, 160, yPos, { align: "right" })
        yPos += 5
        doc.text(`     Passengers: ${booking.passengers?.length || 0}`, 30, yPos)
        yPos += 6
      })
    }
    
    if (data.tourBookings && data.tourBookings.length > 0) {
      yPos += 4
      doc.text("Tour Package Bookings:", 25, yPos)
      yPos += 6
      data.tourBookings.forEach((booking, index) => {
        doc.setFontSize(10)
        doc.text(`  ${index + 1}. ${booking.tourPackage?.name || "Tour Package"}`, 30, yPos)
        renderThaiText(doc, `฿${booking.totalAmount?.toLocaleString() || "0"}`, 160, yPos, { align: "right" })
        yPos += 5
        doc.text(`     Passengers: ${booking.passengers?.length || 0}`, 30, yPos)
        yPos += 5
        
        // Add tour program details if available
        if (booking.tourProgramDetails) {
          doc.setFontSize(9)
          doc.setTextColor(100)
          doc.text(`     Program: See attached details`, 30, yPos)
          doc.setTextColor(0)
          yPos += 4
        }
        
        if (booking.departureDate && booking.returnDate) {
          doc.setFontSize(9)
          doc.text(`     Dates: ${format(new Date(booking.departureDate), "dd MMM yyyy")} - ${format(new Date(booking.returnDate), "dd MMM yyyy")}`, 30, yPos)
          yPos += 4
        }
        
        if (booking.pickupLocation && booking.pickupTime) {
          doc.setFontSize(9)
          doc.text(`     Pickup: ${booking.pickupLocation} at ${booking.pickupTime}`, 30, yPos)
          yPos += 4
        }
        
        yPos += 2
      })
    }
    
    // Show total passengers
    if (data.passengers) {
      yPos += 4
      doc.setFontSize(11)
      doc.text(`Total Passengers: ${data.passengers.length}`, 25, yPos)
      yPos += 8
    }
  } else {
    // Individual invoice - show single passenger's portion
    doc.text(`Travel Service for ${data.passenger?.firstName} ${data.passenger?.lastName}`, 25, yPos)
    renderThaiText(doc, `฿${data.amount.toLocaleString()}`, 160, yPos, { align: "right" })
    yPos += 8
  }
  
  // Summary section
  yPos += 10
  doc.line(120, yPos, 190, yPos)
  yPos += 7
  
  doc.setFontSize(11)
  doc.text("Subtotal:", 120, yPos)
  renderThaiText(doc, `฿${data.amount.toLocaleString()}`, 185, yPos, { align: "right" })
  yPos += 7

  doc.text("VAT (7%):", 120, yPos)
  renderThaiText(doc, `฿${data.tax.toLocaleString()}`, 185, yPos, { align: "right" })
  yPos += 3
  
  doc.line(120, yPos, 190, yPos)
  yPos += 7
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Total Amount:", 120, yPos)
  renderThaiText(doc, `฿${data.totalAmount.toLocaleString()}`, 185, yPos, { align: "right" })
  
  // QR Code section
  if (data.qrCode) {
    yPos += 20
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Payment QR Code:", 20, yPos)
    
    // Convert base64 QR code to image and add to PDF
    try {
      doc.addImage(data.qrCode, "PNG", 20, yPos + 5, 50, 50)
    } catch (error) {
      console.error("Error adding QR code to PDF:", error)
    }
  }
  
  // Footer
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text("This is a computer-generated invoice. No signature required.", 105, 270, { align: "center" })
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy HH:mm")}`, 105, 275, { align: "center" })
  
  // Add tour program details on separate page if available
  if (data.tourBookings && data.tourBookings.some((b: any) => b.tourProgramDetails)) {
    doc.addPage()
    
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.setFont("helvetica", "bold")
    doc.text("TOUR PROGRAM DETAILS", 105, 20, { align: "center" })
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Invoice: ${data.invoiceNumber}`, 105, 28, { align: "center" })
    
    let detailsYPos = 45
    
    data.tourBookings.forEach((booking: any, index: number) => {
      if (booking.tourProgramDetails) {
        // Tour package header
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text(`${booking.tourPackage?.name || "Tour Package " + (index + 1)}`, 20, detailsYPos)
        detailsYPos += 8
        
        // Tour dates and pickup info
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        if (booking.departureDate && booking.returnDate) {
          doc.text(`Travel Dates: ${format(new Date(booking.departureDate), "dd MMM yyyy")} - ${format(new Date(booking.returnDate), "dd MMM yyyy")}`, 20, detailsYPos)
          detailsYPos += 6
        }
        
        if (booking.pickupLocation && booking.pickupTime) {
          doc.text(`Pickup: ${booking.pickupLocation} at ${booking.pickupTime}`, 20, detailsYPos)
          detailsYPos += 6
        }
        
        detailsYPos += 4
        
        // Program details
        doc.setFont("helvetica", "bold")
        doc.text("Program Itinerary:", 20, detailsYPos)
        detailsYPos += 6
        
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        
        // Split long text into lines
        const lines = doc.splitTextToSize(booking.tourProgramDetails, 170)
        lines.forEach((line: string) => {
          if (detailsYPos > 270) {
            doc.addPage()
            detailsYPos = 20
          }
          doc.text(line, 20, detailsYPos)
          detailsYPos += 5
        })
        
        // Special requirements if any
        if (booking.specialRequirements) {
          detailsYPos += 6
          doc.setFont("helvetica", "bold")
          doc.text("Special Requirements:", 20, detailsYPos)
          detailsYPos += 6
          
          doc.setFont("helvetica", "normal")
          const reqLines = doc.splitTextToSize(booking.specialRequirements, 170)
          reqLines.forEach((line: string) => {
            if (detailsYPos > 270) {
              doc.addPage()
              detailsYPos = 20
            }
            doc.text(line, 20, detailsYPos)
            detailsYPos += 5
          })
        }
        
        detailsYPos += 10
      }
    })
  }
  
  // Generate PDF as base64
  const pdfBase64 = doc.output("datauristring")
  
  // In a real implementation, you would upload this to cloud storage
  // For now, return the base64 data URL
  return pdfBase64
}

// Helper function to generate multiple PDFs
export async function generateMultipleInvoicePDFs(invoices: InvoiceData[]): Promise<string[]> {
  const pdfUrls: string[] = []
  
  for (const invoice of invoices) {
    const pdfUrl = await generateInvoicePDF(invoice)
    pdfUrls.push(pdfUrl)
  }
  
  return pdfUrls
}