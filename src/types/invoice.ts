export interface PTSystemInvoiceData {
  // Document Information
  type: "group" | "individual"
  invoiceNumber: string
  poNumber: string
  bcNumber: string // Booking confirmation number
  docDate: Date
  creditTerms: number // in days
  dueDate: Date
  owner: string // Document owner name
  issuer: string // Person who issued the invoice

  // Company Information (From)
  companyName: string
  companyNameTh: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyTaxId: string

  // Customer Information (To)
  customerType: "department" | "individual"
  customerName: string
  customerNameTh?: string
  customerAddress: string
  customerTaxId?: string
  customerPhone?: string
  customerEmail?: string

  // Service Items
  items: InvoiceItem[]

  // Financial Summary
  subtotal: number
  tax: number
  taxRate: number
  airportTax: number
  totalAmount: number
  amountInWords: string
  amountInWordsTh?: string

  // Additional Services
  baggageCharge: number
  mealCharge: number
  seatSelectionCharge: number

  // Payment Information
  paymentMethod?: "EDC" | "CASH" | "TRANSFER" | "CHEQUE"
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  qrCode?: string

  // Remarks
  remarks?: string[]

  // Footer
  terms?: string
  termsTh?: string
  receivedBy?: string
  receivedDate?: Date

  // Original data references
  department?: any
  customer?: any
  bookings?: any[]
  tourBookings?: any[]
  passengers?: any[]
}

export interface InvoiceItem {
  type: "AIR" | "TOUR" | "SERVICE"
  description: string
  passengerName?: string
  flightDetails?: FlightDetail[]
  tourDetails?: TourDetail
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface FlightDetail {
  airline: string
  flightNumber: string
  departure: string
  arrival: string
  departureDate?: Date
  arrivalDate?: Date
  class?: string
}

export interface TourDetail {
  packageName: string
  destination: string
  departureDate: Date
  returnDate: Date
  pickupLocation?: string
  pickupTime?: string
  program?: string
}

// Helper type for amount to words conversion
export interface AmountToWords {
  convertToWords(amount: number, language?: "en" | "th"): string
  convertToThaiWords(amount: number): string
  convertToEnglishWords(amount: number): string
}