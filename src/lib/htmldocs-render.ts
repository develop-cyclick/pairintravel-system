import { render } from '@htmldocs/render'
import { PTSystemInvoiceData } from '@/types/invoice'

/**
 * HTMLDocs PDF Rendering Service
 * Uses Chromium-based rendering for proper Thai font support
 */

/**
 * Render PT System Invoice using HTMLDocs
 */
export async function renderPTSystemInvoice(data: PTSystemInvoiceData): Promise<string> {
  try {
    // Import the template dynamically
    const PTSystemInvoice = (await import('../../documents/PTSystemInvoice')).default

    // Prepare the props
    const props = {
      type: data.type,
      invoiceNumber: data.invoiceNumber,
      poNumber: data.poNumber || '',
      bcNumber: data.bcNumber,
      docDate: data.docDate,
      dueDate: data.dueDate,
      creditTerms: data.creditTerms,
      owner: data.owner,
      issuer: data.issuer,

      // Company Info
      companyName: data.companyName || 'บริษัท ไพรินทร์ (จ.2562) จำกัด (สำนักงานใหญ่)',
      companyNameTh: data.companyNameTh || 'บริษัท ไพรินทร์ (จ.2562) จำกัด',
      companyAddress: data.companyAddress || 'เลขที่ 46 ซอยสวนผัก 32/1 แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพมหานคร 10170',
      companyPhone: data.companyPhone || '02-589-1755, 02-589-4053',
      companyEmail: data.companyEmail || 'pairin.jo2562@gmail.com',
      companyTaxId: data.companyTaxId || '0105561213350',

      // Customer Info
      customerName: data.customerName,
      customerNameTh: data.customerNameTh,
      customerAddress: data.customerAddress || '',
      customerTaxId: data.customerTaxId,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,

      // Items
      items: data.items || [],

      // Financial
      subtotal: data.subtotal,
      tax: data.tax,
      airportTax: data.airportTax,
      totalAmount: data.totalAmount,
      baggageCharge: data.baggageCharge,
      mealCharge: data.mealCharge,
      seatSelectionCharge: data.seatSelectionCharge,

      // Payment
      paymentMethod: data.paymentMethod,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      qrCode: data.qrCode,
      receivedBy: data.receivedBy,

      // Footer
      termsTh: data.termsTh,
      remarks: data.remarks
    }

    // Render the component to PDF
    const pdfBuffer = await render(PTSystemInvoice, props)

    // Convert Buffer to base64 data URL
    const base64 = pdfBuffer.toString('base64')
    const dataUrl = `data:application/pdf;base64,${base64}`

    return dataUrl
  } catch (error) {
    console.error('Error rendering PT System invoice:', error)
    throw new Error('Failed to generate PT System invoice PDF')
  }
}

/**
 * Render Standard Invoice using HTMLDocs
 */
export async function renderStandardInvoice(data: any): Promise<string> {
  try {
    // Import the template dynamically
    const StandardInvoice = (await import('../../documents/StandardInvoice')).default

    // Prepare the props
    const props = {
      type: data.type,
      invoiceNumber: data.invoiceNumber,
      poNumber: data.poNumber || '',
      totalAmount: data.totalAmount,
      tax: data.tax,
      amount: data.amount,
      qrCode: data.qrCode,
      createdAt: data.createdAt,
      department: data.department,
      customer: data.customer,
      mainCustomer: data.mainCustomer,
      passenger: data.passenger,
      bookings: data.bookings,
      tourBookings: data.tourBookings,
      passengers: data.passengers
    }

    // Render the component to PDF
    const pdfBuffer = await render(StandardInvoice, props)

    // Convert Buffer to base64 data URL
    const base64 = pdfBuffer.toString('base64')
    const dataUrl = `data:application/pdf;base64,${base64}`

    return dataUrl
  } catch (error) {
    console.error('Error rendering standard invoice:', error)
    throw new Error('Failed to generate standard invoice PDF')
  }
}

/**
 * Check if HTMLDocs is available and properly configured
 */
export function isHTMLDocsAvailable(): boolean {
  try {
    // Check if render function is available
    return typeof render === 'function'
  } catch {
    return false
  }
}

/**
 * Fallback to jsPDF if HTMLDocs is not available
 */
export async function generateInvoicePDFWithFallback(data: any, usePTSystem: boolean = false): Promise<string> {
  try {
    // Try HTMLDocs first
    if (isHTMLDocsAvailable()) {
      if (usePTSystem) {
        // Prepare PT System data
        const { preparePTSystemInvoiceData } = await import('./pdf-generator-ptsystem')
        const ptSystemData = preparePTSystemInvoiceData(data)
        return await renderPTSystemInvoice(ptSystemData)
      } else {
        return await renderStandardInvoice(data)
      }
    }
  } catch (error) {
    console.warn('HTMLDocs rendering failed, falling back to jsPDF:', error)
  }

  // Fallback to jsPDF
  if (usePTSystem) {
    const { generatePTSystemInvoicePDF, preparePTSystemInvoiceData } = await import('./pdf-generator-ptsystem')
    const ptSystemData = preparePTSystemInvoiceData(data)
    return await generatePTSystemInvoicePDF(ptSystemData)
  } else {
    const { generateInvoicePDF } = await import('./pdf-generator')
    return await generateInvoicePDF(data)
  }
}