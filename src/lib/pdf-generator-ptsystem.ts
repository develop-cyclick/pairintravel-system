import jsPDF from "jspdf"
import { format } from "date-fns"
import { PTSystemInvoiceData, InvoiceItem, FlightDetail } from "@/types/invoice"
import { addThaiFont, renderThaiText, normalizeThaiNumbers, containsThaiCharacters } from "./pdf-thai-font"

// Number to words converter for Thai Baht
function numberToThaiWords(num: number): string {
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const tens = ['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ']
  const positions = ['', 'หมื่น', 'แสน', 'ล้าน']

  // For now, return a simple format
  return `${num.toLocaleString('th-TH')} บาทถ้วน`
}

function numberToEnglishWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']

  if (num === 0) return 'ZERO BAHT ONLY'

  const thousands = Math.floor(num / 1000)
  const hundreds = Math.floor((num % 1000) / 100)
  const remainder = num % 100
  const tensPlace = Math.floor(remainder / 10)
  const onesPlace = remainder % 10

  let words = []

  if (thousands > 0) {
    if (thousands < 10) {
      words.push(ones[thousands])
    } else if (thousands < 20) {
      words.push(teens[thousands - 10])
    } else if (thousands < 100) {
      const t = Math.floor(thousands / 10)
      const o = thousands % 10
      words.push(tens[t])
      if (o > 0) words.push(ones[o])
    }
    words.push('THOUSAND')
  }

  if (hundreds > 0) {
    words.push(ones[hundreds], 'HUNDRED')
  }

  if (remainder >= 20) {
    words.push(tens[tensPlace])
    if (onesPlace > 0) words.push(ones[onesPlace])
  } else if (remainder >= 10) {
    words.push(teens[remainder - 10])
  } else if (remainder > 0) {
    if (words.length > 0) words.push('AND')
    words.push(ones[remainder])
  }

  return words.join(' ') + ' BAHT ONLY'
}

export async function generatePTSystemInvoicePDF(data: PTSystemInvoiceData): Promise<string> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  // Add Thai font support
  addThaiFont(doc)

  // Set default font
  doc.setFont("helvetica")

  // Company Header Section
  let yPos = 15

  // Company Logo placeholder (left side)
  doc.setDrawColor(200)
  doc.rect(15, yPos, 20, 20) // Logo placeholder
  doc.setFontSize(8)
  doc.text("LOGO", 25, yPos + 12, { align: "center" })

  // Company Name and Details (center-right)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  const companyName = data.companyName || "บริษัท ไพรินทร์ (จ.2562) จำกัด (สำนักงานใหญ่)"
  if (containsThaiCharacters(companyName)) {
    renderThaiText(doc, companyName, 40, yPos + 5)
  } else {
    doc.text(companyName, 40, yPos + 5)
  }

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  renderThaiText(doc, "สำหรับลูกค้า", 180, yPos, { align: "right" })

  doc.setFontSize(9)
  const address = data.companyAddress || "เลขที่ 46 ซอยสวนผัก 32/1 แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพมหานคร 10170"
  renderThaiText(doc, address, 40, yPos + 10)
  renderThaiText(doc, `โทร ${data.companyPhone || "02-589-1755, 02-589-4053"} Email: ${data.companyEmail || "pairin.jo2562@gmail.com"}`, 40, yPos + 15)
  renderThaiText(doc, `เลขประจำตัวผู้เสียภาษีอากร ${data.companyTaxId || "0105561213350"}`, 40, yPos + 20)

  yPos += 30

  // Invoice Title
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  renderThaiText(doc, "ใบแจ้งหนี้/ใบเสร็จรับเงิน", 105, yPos, { align: "center" })
  doc.text("INVOICE/RECEIPT", 105, yPos + 5, { align: "center" })

  yPos += 15

  // Customer and Document Info Section (Two columns)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  // Left Column - Customer Info
  doc.text(`Dep. ${data.customerName}`, 15, yPos)
  yPos += 5
  doc.setFontSize(9)
  const addressLines = doc.splitTextToSize(`Address : ${data.customerAddress}`, 100)
  addressLines.forEach((line: string) => {
    doc.text(line, 15, yPos)
    yPos += 4
  })
  if (data.customerTaxId) {
    renderThaiText(doc, `เลขประจำตัวผู้เสียภาษี ${data.customerTaxId}`, 15, yPos)
  }

  // Right Column - Document Info
  const rightColX = 130
  let rightY = 65
  doc.setFontSize(9)

  doc.text("page", rightColX, rightY)
  doc.text(":1 of 1", rightColX + 20, rightY)
  rightY += 5

  doc.text("Doc NO.", rightColX, rightY)
  doc.text(`:${data.invoiceNumber}`, rightColX + 20, rightY)
  rightY += 5

  doc.text("Type", rightColX, rightY)
  doc.text(":Credit", rightColX + 20, rightY)
  rightY += 5

  doc.text("Doc Date", rightColX, rightY)
  doc.text(`:${format(data.docDate, "dd-MM-yyyy")}`, rightColX + 20, rightY)
  rightY += 5

  doc.text("Credit Terms", rightColX, rightY)
  doc.text(`:${data.creditTerms} Days`, rightColX + 20, rightY)
  rightY += 5

  doc.text("Due Date", rightColX, rightY)
  doc.text(`:${format(data.dueDate, "dd-MM-yyyy")}`, rightColX + 20, rightY)
  rightY += 5

  doc.text("Bc No.", rightColX, rightY)
  doc.text(`:${data.bcNumber}`, rightColX + 20, rightY)
  rightY += 5

  doc.text("Owner", rightColX, rightY)
  doc.text(`:${data.owner}`, rightColX + 20, rightY)
  rightY += 5

  doc.text("Issuer", rightColX, rightY)
  doc.text(`:${data.issuer}`, rightColX + 20, rightY)

  yPos = Math.max(yPos + 10, rightY + 10)

  // Service Table Header
  doc.text("For the following item(s) as below", 15, yPos)
  yPos += 5

  // Table Headers
  doc.line(15, yPos, 195, yPos)
  yPos += 5
  doc.setFont("helvetica", "bold")
  doc.text("Passenger/Service", 20, yPos)
  doc.text("Record", 100, yPos, { align: "center" })
  doc.text("Selling", 140, yPos, { align: "right" })
  doc.text("Total(THB)", 180, yPos, { align: "right" })
  yPos += 2
  doc.line(15, yPos, 195, yPos)
  yPos += 5

  // Service Items
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  data.items.forEach((item: InvoiceItem) => {
    // Main item line
    doc.setFont("helvetica", "bold")
    doc.text(item.type, 20, yPos)
    doc.text(item.quantity.toString(), 100, yPos, { align: "center" })
    doc.text(item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }), 140, yPos, { align: "right" })
    doc.text(item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }), 180, yPos, { align: "right" })
    yPos += 5

    // Passenger name
    doc.setFont("helvetica", "normal")
    if (item.passengerName) {
      doc.text(item.passengerName, 20, yPos)
      yPos += 5
    }

    // Flight details
    if (item.flightDetails && item.flightDetails.length > 0) {
      doc.setFont("helvetica", "italic")
      doc.text(`Flight Detail (${item.flightDetails[0].airline})`, 20, yPos)
      yPos += 5

      doc.setFont("helvetica", "normal")
      doc.text("Departure", 25, yPos)
      doc.text("Arrivals", 80, yPos)
      yPos += 4

      item.flightDetails.forEach((flight: FlightDetail) => {
        doc.text(flight.departure, 25, yPos)
        doc.text(flight.arrival, 80, yPos)
        yPos += 4
      })
    }

    yPos += 3
  })

  // Additional Services
  yPos += 5
  renderThaiText(doc, "ค่าโหลดสัมภาระใต้ท้องเครื่อง", 20, yPos)
  doc.text(data.baggageCharge.toFixed(2), 180, yPos, { align: "right" })
  yPos += 4

  renderThaiText(doc, "ค่าบริการอาหารและเครื่องดื่ม", 20, yPos)
  doc.text(data.mealCharge.toFixed(2), 180, yPos, { align: "right" })
  yPos += 4

  renderThaiText(doc, "ค่าบริการเลือกที่นั่ง", 20, yPos)
  doc.text(data.seatSelectionCharge.toFixed(2), 180, yPos, { align: "right" })
  yPos += 5

  // Summary Section
  doc.line(120, yPos, 195, yPos)
  yPos += 5

  doc.setFont("helvetica", "bold")
  renderThaiText(doc, "รวม", 120, yPos)
  doc.text(data.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 }), 180, yPos, { align: "right" })
  yPos += 5

  renderThaiText(doc, "ค่าภาษีสนามบิน", 120, yPos)
  doc.text(data.airportTax.toLocaleString("en-US", { minimumFractionDigits: 2 }), 180, yPos, { align: "right" })
  yPos += 5

  doc.setFontSize(10)
  renderThaiText(doc, "ยอดรวมสุทธิ", 120, yPos)
  doc.text(data.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }), 180, yPos, { align: "right" })
  yPos += 8

  // Amount in words
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Text Description", 15, yPos)
  doc.text(`:${numberToEnglishWords(Math.floor(data.totalAmount))}`, 45, yPos)
  yPos += 6

  // Remarks
  if (data.remarks && data.remarks.length > 0) {
    doc.text("Remarks", 15, yPos)
    const remarkX = 45
    data.remarks.forEach((remark: string) => {
      doc.text(`:${remark}`, remarkX, yPos)
      yPos += 4
    })
  }

  yPos += 10

  // QR Code and Payment Section
  if (data.qrCode) {
    try {
      doc.addImage(data.qrCode, "PNG", 155, yPos, 35, 35)
    } catch (error) {
      // QR code placeholder
      doc.setDrawColor(200)
      doc.rect(155, yPos, 35, 35)
      doc.setFontSize(8)
      doc.text("QR CODE", 172.5, yPos + 20, { align: "center" })
    }
  }

  // Payment method checkboxes
  doc.setFontSize(9)
  renderThaiText(doc, "ผู้รับเงิน................................................................", 15, yPos + 5)
  yPos += 15

  doc.text("(", 15, yPos)
  renderThaiText(doc, data.receivedBy || "ณัฏฐ์ ทัยเขียวศรี", 17, yPos)
  doc.text(")", 60, yPos)

  const paymentMethods = ["EDC", "CASH", "TRANSFER", "CHEQUE"]
  let checkX = 80
  paymentMethods.forEach((method) => {
    doc.rect(checkX, yPos - 3, 3, 3)
    if (data.paymentMethod === method) {
      doc.text("✓", checkX + 0.5, yPos - 0.5)
    }
    doc.text(method, checkX + 5, yPos)
    checkX += 25
  })

  yPos += 6

  // Bank details
  if (data.bankName && data.bankAccountNumber) {
    doc.rect(80, yPos - 3, 3, 3)
    if (data.paymentMethod === "TRANSFER") {
      doc.text("✓", 80.5, yPos - 0.5)
    }
    renderThaiText(doc, `${data.bankName} เลขที่บัญชี ${data.bankAccountNumber}`, 85, yPos)
    yPos += 5
    renderThaiText(doc, data.bankAccountName || "บริษัท ไพรินทร์ (จ.2562) จำกัด", 85, yPos)
  }

  // Footer Terms (if more than one page)
  const pageHeight = 297 // A4 height in mm
  if (yPos < pageHeight - 30) {
    yPos = pageHeight - 25
  }

  doc.setFontSize(8)
  doc.setTextColor(100)
  const footerText = data.termsTh || "โปรดตรวจสอบความถูกต้องของตั๋วและราคาก่อนรับตั๋วและสั่งจ่ายเช็คในนาม บริษัท ไพรินทร์ (จ.2562) จำกัด เท่านั้น"
  const footerLines = doc.splitTextToSize(footerText, 170)
  footerLines.forEach((line: string) => {
    renderThaiText(doc, line, 105, yPos, { align: "center" })
    yPos += 4
  })

  // Generate PDF as base64
  const pdfBase64 = doc.output("datauristring")
  return pdfBase64
}

// Helper function to prepare invoice data in PT System format
export function preparePTSystemInvoiceData(originalData: any): PTSystemInvoiceData {
  const creditTerms = 7 // Default 7 days
  const docDate = new Date(originalData.createdAt)
  const dueDate = new Date(docDate)
  dueDate.setDate(dueDate.getDate() + creditTerms)

  // Prepare items array
  const items: InvoiceItem[] = []

  // Add flight bookings as items
  if (originalData.bookings) {
    originalData.bookings.forEach((booking: any) => {
      const passengers = booking.passengers || []
      passengers.forEach((passenger: any) => {
        items.push({
          type: "AIR",
          description: `${booking.airline} - ${booking.flightNumber}`,
          passengerName: `${passenger.customer?.title || ""} ${passenger.customer?.firstName} ${passenger.customer?.lastName}`.trim(),
          flightDetails: [{
            airline: booking.airline,
            flightNumber: booking.flightNumber,
            departure: booking.origin,
            arrival: booking.destination,
            departureDate: booking.departureDate,
            arrivalDate: booking.arrivalDate
          }],
          quantity: 1,
          unitPrice: passenger.individualPrice || booking.basePrice || 0,
          totalPrice: passenger.individualPrice || booking.basePrice || 0
        })
      })
    })
  }

  // Add tour bookings as items
  if (originalData.tourBookings) {
    originalData.tourBookings.forEach((booking: any) => {
      items.push({
        type: "TOUR",
        description: booking.tourPackage?.name || "Tour Package",
        tourDetails: {
          packageName: booking.tourPackage?.name || "",
          destination: booking.tourPackage?.destination || "",
          departureDate: booking.departureDate,
          returnDate: booking.returnDate,
          pickupLocation: booking.pickupLocation,
          pickupTime: booking.pickupTime,
          program: booking.tourProgramDetails
        },
        quantity: booking.passengers?.length || 1,
        unitPrice: booking.totalAmount / (booking.passengers?.length || 1),
        totalPrice: booking.totalAmount
      })
    })
  }

  const subtotal = originalData.amount || 0
  const totalAmount = originalData.totalAmount || 0

  return {
    // Document Information
    type: originalData.type as "group" | "individual",
    invoiceNumber: originalData.invoiceNumber,
    poNumber: originalData.poNumber || "",
    bcNumber: originalData.bookingRef || `BC${Date.now().toString(36).toUpperCase()}`,
    docDate: docDate,
    creditTerms: creditTerms,
    dueDate: dueDate,
    owner: originalData.department?.contactPerson || originalData.customer?.firstName + " " + originalData.customer?.lastName || "",
    issuer: "System Generated",

    // Company Information
    companyName: "บริษัท ไพรินทร์ (จ.2562) จำกัด (สำนักงานใหญ่)",
    companyNameTh: "บริษัท ไพรินทร์ (จ.2562) จำกัด",
    companyAddress: "เลขที่ 46 ซอยสวนผัก 32/1 แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพมหานคร 10170",
    companyPhone: "02-589-1755, 02-589-4053",
    companyEmail: "pairin.jo2562@gmail.com",
    companyTaxId: "0105561213350",

    // Customer Information
    customerType: originalData.department ? "department" : "individual",
    customerName: originalData.department?.nameEn || `${originalData.customer?.firstName} ${originalData.customer?.lastName}` || "Customer",
    customerNameTh: originalData.department?.nameTh,
    customerAddress: originalData.department?.address || originalData.customer?.address || "",
    customerTaxId: originalData.department?.taxId,
    customerPhone: originalData.department?.phone || originalData.customer?.phone,
    customerEmail: originalData.department?.email || originalData.customer?.email,

    // Service Items
    items: items,

    // Financial Summary
    subtotal: subtotal,
    tax: originalData.tax || 0,
    taxRate: 7,
    airportTax: 200.00, // Fixed airport tax
    totalAmount: totalAmount,
    amountInWords: numberToEnglishWords(Math.floor(totalAmount)),
    amountInWordsTh: numberToThaiWords(Math.floor(totalAmount)),

    // Additional Services
    baggageCharge: 0.00,
    mealCharge: 0.00,
    seatSelectionCharge: 0.00,

    // Payment Information
    paymentMethod: undefined,
    bankName: "Krungsri",
    bankAccountNumber: "460-1-08471-1",
    bankAccountName: "บริษัท ไพรินทร์ (จ.2562) จำกัด",
    qrCode: originalData.qrCode,

    // Remarks
    remarks: originalData.remarks || [],

    // Footer
    terms: "Please verify ticket details and prices before accepting. Make checks payable to Pairin (2562) Co., Ltd. only.",
    termsTh: "โปรดตรวจสอบความถูกต้องของตั๋วและราคาก่อนรับตั๋วและสั่งจ่ายเช็คในนาม บริษัท ไพรินทร์ (จ.2562) จำกัด เท่านั้น",

    // Original references
    department: originalData.department,
    customer: originalData.customer,
    bookings: originalData.bookings,
    tourBookings: originalData.tourBookings,
    passengers: originalData.passengers
  }
}