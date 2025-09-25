/**
 * Test file for Thai invoice rendering
 * This demonstrates Thai text rendering capabilities with HTMLDocs
 */

import { renderPTSystemInvoice } from '@/lib/htmldocs-render'
import { PTSystemInvoiceData } from '@/types/invoice'

export async function testThaiInvoiceRendering() {
  // Test data with Thai characters
  const testInvoiceData: PTSystemInvoiceData = {
    // Document Information
    type: 'group',
    invoiceNumber: 'INV-2024-001',
    poNumber: 'PO-2024-001',
    bcNumber: 'BC-2024-001',
    docDate: new Date(),
    creditTerms: 7,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    owner: 'นายสมชาย ใจดี',
    issuer: 'ระบบอัตโนมัติ',

    // Company Information (Thai)
    companyName: 'บริษัท ไพรินทร์ (จ.2562) จำกัด (สำนักงานใหญ่)',
    companyNameTh: 'บริษัท ไพรินทร์ (จ.2562) จำกัด',
    companyAddress: 'เลขที่ 46 ซอยสวนผัก 32/1 แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพมหานคร 10170',
    companyPhone: '02-589-1755, 02-589-4053',
    companyEmail: 'pairin.jo2562@gmail.com',
    companyTaxId: '0105561213350',

    // Customer Information (Thai)
    customerType: 'department',
    customerName: 'กรมการบิน กองทัพอากาศ',
    customerNameTh: 'กรมการบิน กองทัพอากาศ',
    customerAddress: 'ถนนพหลโยธิน แขวงสนามบิน เขตดอนเมือง กรุงเทพมหานคร 10210',
    customerTaxId: '0994000165134',
    customerPhone: '02-534-1234',
    customerEmail: 'aviation@rtaf.mil.th',

    // Service Items with Thai descriptions
    items: [
      {
        type: 'AIR',
        description: 'ตั๋วเครื่องบิน',
        passengerName: 'นายสมชาย ใจดี',
        flightDetails: [
          {
            airline: 'การบินไทย',
            flightNumber: 'TG101',
            departure: 'กรุงเทพฯ (BKK)',
            arrival: 'เชียงใหม่ (CNX)',
            departureDate: '2024-12-01',
            arrivalDate: '2024-12-01'
          }
        ],
        quantity: 1,
        unitPrice: 3500.00,
        totalPrice: 3500.00
      },
      {
        type: 'AIR',
        description: 'ตั๋วเครื่องบิน',
        passengerName: 'นางสมหญิง ใจงาม',
        flightDetails: [
          {
            airline: 'การบินไทย',
            flightNumber: 'TG101',
            departure: 'กรุงเทพฯ (BKK)',
            arrival: 'เชียงใหม่ (CNX)',
            departureDate: '2024-12-01',
            arrivalDate: '2024-12-01'
          }
        ],
        quantity: 1,
        unitPrice: 3500.00,
        totalPrice: 3500.00
      }
    ],

    // Financial Summary
    subtotal: 7000.00,
    tax: 490.00,
    taxRate: 7,
    airportTax: 200.00,
    totalAmount: 7690.00,
    amountInWords: 'SEVEN THOUSAND SIX HUNDRED NINETY BAHT ONLY',
    amountInWordsTh: 'เจ็ดพันหกร้อยเก้าสิบบาทถ้วน',

    // Additional Services (Thai)
    baggageCharge: 0.00,
    mealCharge: 0.00,
    seatSelectionCharge: 0.00,

    // Payment Information
    paymentMethod: 'TRANSFER',
    bankName: 'ธนาคารกรุงศรีอยุธยา',
    bankAccountNumber: '460-1-08471-1',
    bankAccountName: 'บริษัท ไพรินทร์ (จ.2562) จำกัด',
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    receivedBy: 'ณัฏฐ์ ทัยเขียวศรี',

    // Remarks (Thai)
    remarks: [
      'โปรดชำระเงินภายในวันที่กำหนด',
      'หากมีข้อสงสัยกรุณาติดต่อฝ่ายบัญชี'
    ],

    // Footer (Thai)
    terms: 'Please verify ticket details and prices before accepting.',
    termsTh: 'โปรดตรวจสอบความถูกต้องของตั๋วและราคาก่อนรับตั๋วและสั่งจ่ายเช็คในนาม บริษัท ไพรินทร์ (จ.2562) จำกัด เท่านั้น',

    // Original references (optional)
    department: undefined,
    customer: undefined,
    bookings: undefined,
    tourBookings: undefined,
    passengers: undefined
  }

  try {
    console.log('🔤 Testing Thai invoice rendering...')
    console.log('Thai text samples:')
    console.log('- Company: บริษัท ไพรินทร์ (จ.2562) จำกัด')
    console.log('- Customer: กรมการบิน กองทัพอากาศ')
    console.log('- Amount: เจ็ดพันหกร้อยเก้าสิบบาทถ้วน')

    const pdfDataUrl = await renderPTSystemInvoice(testInvoiceData)

    console.log('✅ Thai invoice rendered successfully!')
    console.log('PDF generated with length:', pdfDataUrl.length)

    return {
      success: true,
      pdfDataUrl,
      message: 'Thai invoice rendered successfully with HTMLDocs'
    }
  } catch (error) {
    console.error('❌ Error rendering Thai invoice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to render Thai invoice'
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testThaiInvoiceRendering().then(result => {
    console.log('Test result:', result)
  })
}