import { PTSystemInvoiceData } from "@/types/invoice"
import { generatePreviewHTML } from "./invoice-preview"

/**
 * Render invoice to HTML string for PDF generation
 * This uses the existing preview HTML generation but optimized for PDF output
 */
export async function renderInvoiceToHTML(invoiceData: PTSystemInvoiceData): Promise<string> {
  try {
    // Use the existing HTML generation from invoice-preview
    // It already handles Thai fonts, styling, and all invoice formatting
    const html = generatePreviewHTML(invoiceData)

    // Add print-specific styles for better PDF output
    const pdfOptimizedHTML = optimizeHTMLForPDF(html)

    return pdfOptimizedHTML
  } catch (error) {
    console.error('Error rendering invoice to HTML:', error)
    throw new Error('Failed to render invoice HTML: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

/**
 * Optimize HTML for PDF generation
 * Adds print-specific styles and ensures proper rendering
 */
function optimizeHTMLForPDF(html: string): string {
  // Add print media query and page break controls
  const printStyles = `
    <style>
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Prevent page breaks inside important sections */
        .invoice-header,
        .customer-info,
        .invoice-items table,
        .totals-section,
        .payment-section {
          page-break-inside: avoid;
        }

        /* Ensure page breaks between major sections if needed */
        .page-break {
          page-break-after: always;
        }

        /* Hide print button and interactive elements */
        button,
        .no-print {
          display: none !important;
        }
      }

      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      /* Ensure fonts are embedded */
      @font-face {
        font-family: 'Sarabun';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/sarabun/v13/DtVhJx26TKEr37c9YHZJmmEkVw.woff2) format('woff2');
      }

      @font-face {
        font-family: 'Sarabun';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/sarabun/v13/DtVmJx26TKEr37c9aBBx3mQ.woff2) format('woff2');
      }

      @font-face {
        font-family: 'Noto Sans Thai';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/notosansthai/v20/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5RuhpQ.woff2) format('woff2');
      }

      @font-face {
        font-family: 'Noto Sans Thai';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/notosansthai/v20/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU6xvhpQ.woff2) format('woff2');
      }
    </style>
  `

  // Insert print styles before closing </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${printStyles}</head>`)
  }

  // If no head tag, wrap in proper HTML structure
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice PDF</title>
  ${printStyles}
</head>
<body>
  ${html}
</body>
</html>
  `
}

/**
 * Render multiple invoices to HTML for bulk PDF generation
 */
export async function renderInvoicesToHTML(invoicesData: PTSystemInvoiceData[]): Promise<string[]> {
  const htmlPromises = invoicesData.map(data => renderInvoiceToHTML(data))
  return await Promise.all(htmlPromises)
}

/**
 * Validate invoice data before rendering
 */
export function validateInvoiceData(data: PTSystemInvoiceData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.invoiceNumber) {
    errors.push('Invoice number is required')
  }

  if (!data.companyName) {
    errors.push('Company name is required')
  }

  if (!data.customerName) {
    errors.push('Customer name is required')
  }

  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required')
  }

  if (data.totalAmount <= 0) {
    errors.push('Total amount must be greater than 0')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
