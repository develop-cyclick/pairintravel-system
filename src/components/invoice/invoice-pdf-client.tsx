"use client"

import { useEffect, useRef } from "react"

interface InvoicePDFClientProps {
  html: string
  invoiceNumber: string
  onClose?: () => void
  autoPrint?: boolean
}

export function InvoicePDFClient({
  html,
  invoiceNumber,
  onClose,
  autoPrint = true
}: InvoicePDFClientProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && html) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document

      if (iframeDoc) {
        // Write the HTML content to iframe
        iframeDoc.open()
        iframeDoc.write(html)
        iframeDoc.close()

        // Auto print if enabled
        if (autoPrint) {
          // Give it a moment to render
          setTimeout(() => {
            iframeRef.current?.contentWindow?.print()
          }, 500)
        }
      }
    }
  }, [html, autoPrint])

  return (
    <iframe
      ref={iframeRef}
      className="hidden"
      title={`Invoice ${invoiceNumber}`}
    />
  )
}

/**
 * Generate print-ready HTML with embedded styles
 */
export function generatePrintHTML(invoiceHTML: string, invoiceNumber: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>

  <!-- Google Fonts for better Thai support -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', 'Noto Sans Thai', sans-serif;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }

    /* Thai text specific styling */
    .thai-text {
      font-family: 'Noto Sans Thai', sans-serif;
      letter-spacing: 0;
    }

    /* Print-specific styles */
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }

      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      /* Hide print button if exists */
      .no-print,
      button {
        display: none !important;
      }

      /* Prevent page breaks inside important elements */
      .invoice-header,
      .invoice-details,
      .invoice-table,
      .invoice-summary {
        page-break-inside: avoid;
      }

      /* Force new page for each invoice (useful for multiple invoices) */
      .invoice-container {
        page-break-after: always;
      }

      .invoice-container:last-child {
        page-break-after: auto;
      }

      /* Table styles for print */
      table {
        border-collapse: collapse;
        width: 100%;
      }

      th, td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #f9fafb !important;
        font-weight: 600;
      }

      /* Ensure backgrounds print */
      .bg-gray-50 {
        background-color: #f9fafb !important;
      }

      .bg-gray-100 {
        background-color: #f3f4f6 !important;
      }

      /* QR code sizing for print */
      .qr-code {
        width: 150px;
        height: 150px;
        image-rendering: pixelated;
      }

      /* Signature line */
      .signature-line {
        border-bottom: 1px solid #6b7280;
        width: 200px;
        margin-top: 40px;
      }

      /* Watermark for print */
      .watermark-container {
        position: fixed;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        opacity: 0.08;
      }
    }

    /* Screen preview styles */
    @media screen {
      body {
        padding: 20px;
        background: #f3f4f6;
      }

      .invoice-container {
        max-width: 800px;
        margin: 0 auto 20px;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
    }

    /* Common styles for both screen and print */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
      gap: 20px;
    }

    .logo-section {
      flex: 0 0 120px;
    }

    .company-logo {
      width: 100px;
      height: auto;
      max-height: 100px;
      object-fit: contain;
    }

    /* Watermark styles */
    .watermark-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      opacity: 0.08;
      z-index: 0;
      pointer-events: none;
      width: 500px;
      height: 500px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .watermark {
      width: 350px;
      height: auto;
      max-width: 100%;
      filter: grayscale(100%);
    }

    /* Ensure content appears above watermark */
    .invoice-container {
      position: relative;
      z-index: 1;
      background: white;
    }

    .company-info h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 5px;
    }

    .company-info .thai-name {
      font-size: 18px;
      color: #6b7280;
      font-family: 'Noto Sans Thai', sans-serif;
    }

    .invoice-title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      text-align: center;
      margin: 20px 0;
    }

    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .detail-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .detail-item {
      display: flex;
      margin-bottom: 8px;
    }

    .detail-label {
      font-weight: 500;
      color: #6b7280;
      min-width: 100px;
    }

    .detail-value {
      color: #1f2937;
    }

    .invoice-table {
      margin: 30px 0;
    }

    .invoice-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .invoice-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #e5e7eb;
    }

    .invoice-table td {
      padding: 12px;
      border: 1px solid #e5e7eb;
    }

    .text-right {
      text-align: right;
    }

    .invoice-summary {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }

    .summary-box {
      width: 300px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-row.total {
      font-weight: 700;
      font-size: 18px;
      border-bottom: 2px solid #1f2937;
      border-top: 2px solid #1f2937;
      margin-top: 10px;
      padding: 12px 0;
    }

    .footer-section {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
    }

    .remarks {
      margin-bottom: 30px;
    }

    .remarks h4 {
      font-weight: 600;
      margin-bottom: 10px;
    }

    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 50px;
    }

    .signature-block {
      text-align: center;
    }

    .signature-line {
      border-bottom: 1px solid #6b7280;
      margin: 40px auto 10px;
      width: 200px;
    }
  </style>
</head>
<body>
  ${invoiceHTML}

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

/**
 * Open invoice in new window for printing
 */
export function openPrintWindow(html: string, invoiceNumber: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')

  if (printWindow) {
    const printHTML = generatePrintHTML(html, invoiceNumber)
    printWindow.document.write(printHTML)
    printWindow.document.close()

    // Focus the window so user can see it
    printWindow.focus()
  } else {
    // If popup was blocked, show an error
    alert('Please allow popups for this site to print invoices. You may need to disable your popup blocker.')
  }
}

/**
 * Generate and download PDF using browser's print functionality
 */
export function printToPDF(html: string, invoiceNumber: string) {
  // Create a hidden iframe
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  // Write content to iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (iframeDoc) {
    const printHTML = generatePrintHTML(html, invoiceNumber)
    iframeDoc.open()
    iframeDoc.write(printHTML)
    iframeDoc.close()

    // Trigger print dialog
    setTimeout(() => {
      iframe.contentWindow?.print()

      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 500)
  }
}