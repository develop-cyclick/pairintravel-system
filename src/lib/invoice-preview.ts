import { PTSystemInvoiceData, InvoiceItem, AdditionalCharge } from "@/types/invoice";
import { getLogoBase64 } from "./logo-base64";

/**
 * Generate HTML preview of invoice
 * This generates HTML for preview display without React server-side rendering
 */

/**
 * Generate PT System Invoice HTML for preview
 */
export async function generateInvoicePreviewHTML(
  data: PTSystemInvoiceData
): Promise<string> {
  try {
    // Prepare the props for HTML generation
    const props = {
      type: data.type,
      invoiceNumber: data.invoiceNumber,
      poNumber: data.poNumber || "",
      bcNumber: data.bcNumber,
      docDate: data.docDate,
      dueDate: data.dueDate,
      creditTerms: data.creditTerms,
      owner: data.owner,
      issuer: data.issuer,

      // Company Info
      companyName: data.companyName || "PT System Co., Ltd.",
      companyNameTh: data.companyNameTh || "บริษัท พีที ซิสเต็ม จำกัด",
      companyAddress: data.companyAddress || "Bangkok, Thailand",
      companyPhone: data.companyPhone || "02-XXX-XXXX",
      companyEmail: data.companyEmail || "info@ptsystem.com",
      companyTaxId: data.companyTaxId || "0105561213350",

      // Customer Info
      customerName: data.customerName,
      customerNameTh: data.customerNameTh,
      customerAddress: data.customerAddress || "",
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
      serviceFee: data.serviceFee || 0,
      baggageCharge: data.baggageCharge,
      mealCharge: data.mealCharge,
      seatSelectionCharge: data.seatSelectionCharge,
      additionalCharges: data.additionalCharges || [],
      amountInWords: data.amountInWords,
      amountInWordsTh: data.amountInWordsTh,

      // Payment
      paymentMethod: data.paymentMethod,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      qrCode: data.qrCode,
      receivedBy: data.receivedBy,

      // Reference Numbers
      bookingNumber: data.bookingNumber,
      printingNumber: data.printingNumber,

      // Footer
      termsTh: data.termsTh,
      remarks: data.remarks,
    };

    // Generate HTML directly
    const html = generatePreviewHTML(props);

    return html;
  } catch (error) {
    console.error("Error generating invoice preview HTML:", error);
    // Fallback to simple HTML preview
    return generateFallbackPreviewHTML(data);
  }
}

/**
 * Generate preview HTML with proper styling
 * Exported for use in both preview and PDF generation
 */
export function generatePreviewHTML(props: any): string {
  // Get base64 logo for embedding
  const logoBase64 = getLogoBase64();

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Preview - ${props.invoiceNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'Noto Sans Thai', 'Sarabun', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    /* Print-specific rules that Tailwind doesn't handle */
    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm 20mm;
      }

      body {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 11pt;
      }

      * {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      /* Prevent page breaks inside content */
      .invoice-header,
      .booking-card,
      .info-block,
      .payment-methods,
      .totals-section {
        page-break-inside: avoid;
      }
    }

    /* Payment checkbox checked state (custom pseudo-element) */
    .payment-checkbox.checked::after {
      content: "✓";
      position: absolute;
      top: -2px;
      left: 2px;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body class="font-sans text-[11pt] leading-normal text-gray-700 bg-gray-100 p-[15mm_20mm] print:bg-white print:p-0">
  <div class="max-w-[210mm] w-full mx-auto bg-white p-[30px_40px] shadow-xl rounded-lg relative z-10 print:max-w-full print:w-[170mm] print:shadow-none print:rounded-none print:p-[20px_30px]">
    <!-- Watermark -->
    <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 opacity-5 z-0 pointer-events-none w-[500px] h-[500px] flex justify-center items-center">
      <img src="${logoBase64}" alt="" class="w-[350px] h-auto max-w-full grayscale">
    </div>

    <!-- Header -->
    <div class="mb-5 pb-3 border-b border-gray-200">
      <!-- Company Header -->
      <div class="flex items-start mb-4 relative">
        <div class="flex-shrink-0 mr-5">
          <img src="${logoBase64}" alt="Company Logo" class="w-20 h-20 object-contain">
        </div>
        <div class="flex-1">
          <h1 class="text-base font-bold text-gray-800 mb-1">${props.companyNameTh}</h1>
          <p class="text-[11px] text-gray-600 leading-relaxed my-1">${props.companyAddress}</p>
          <p class="text-[11px] text-gray-600 leading-relaxed my-1">โทร ${props.companyPhone} Email: ${props.companyEmail}</p>
          <p class="text-[11px] text-gray-600 leading-relaxed my-1">เลขประจำตัวผู้เสียภาษี ${props.companyTaxId}</p>
        </div>
        <div class="absolute top-0 right-0 flex items-center gap-1.5 text-[11px] text-gray-600">
          <div class="w-3.5 h-3.5 border border-gray-500 bg-white"></div>
          <span>สำเนาลูกค้า</span>
        </div>
      </div>

      <!-- Invoice Title -->
      <div class="text-center my-4">
        <h2 class="text-base font-bold text-gray-800 mb-0.5">ใบแจ้งหนี้/ใบเสร็จรับเงิน</h2>
        <p class="text-sm font-semibold text-gray-600 mb-1">INVOICE/RECEIPT</p>
        <p class="text-xs text-gray-500 m-0">Dep. Pairin Travel</p>
      </div>
    </div>

    <!-- Address and Invoice Details Grid -->
    <div class="grid grid-cols-2 gap-5 mb-5">
      <!-- Customer Address -->
      <div class="bg-white p-3 border border-gray-200 rounded text-[11px] leading-relaxed">
        <p><strong>Address:</strong> ${props.customerAddress || props.customerName}</p>
        ${props.customerNameTh ? `<p>${props.customerNameTh}</p>` : ""}
        ${props.customerTaxId ? `<p>เลขประจำตัวผู้เสียภาษี ${props.customerTaxId}</p>` : ""}
      </div>

      <!-- Invoice Details -->
      <div class="bg-white p-3 border border-gray-200 rounded">
        <div class="text-[10px] leading-relaxed">
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">page</span>
            <span class="font-medium text-gray-800 text-right">1 of 1</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Doc NO.</span>
            <span class="font-medium text-gray-800 text-right">${props.invoiceNumber}</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Type</span>
            <span class="font-medium text-gray-800 text-right">${props.type === 'group' ? 'Credit' : 'Cash'}</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Doc Date</span>
            <span class="font-medium text-gray-800 text-right">${formatDate(props.docDate)}</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Credit Terms</span>
            <span class="font-medium text-gray-800 text-right">${props.creditTerms} Days</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Due Date</span>
            <span class="font-medium text-gray-800 text-right">${formatDate(props.dueDate)}</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Bc No.</span>
            <span class="font-medium text-gray-800 text-right">${props.bcNumber || '-'}</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Owner</span>
            <span class="font-medium text-gray-800 text-right">${props.owner || '-'}</span>
          </div>
          <div class="flex justify-between my-0.5 py-0.5">
            <span class="text-gray-500 min-w-[80px]">Issuer</span>
            <span class="font-medium text-gray-800 text-right">${props.issuer || '-'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <p class="text-[11px] my-3">For the following item(s) as below</p>
    <table class="w-full border-collapse my-4 text-[11px]">
      <thead>
        <tr>
          <th class="bg-gray-100 p-2 text-left font-semibold text-gray-800 border border-gray-300 w-1/2">Passenger/Service</th>
          <th class="bg-gray-100 p-2 text-center font-semibold text-gray-800 border border-gray-300 w-[15%]">Record</th>
          <th class="bg-gray-100 p-2 text-right font-semibold text-gray-800 border border-gray-300 w-[17.5%]">Selling</th>
          <th class="bg-gray-100 p-2 text-right font-semibold text-gray-800 border border-gray-300 w-[17.5%]">Total(THB)</th>
        </tr>
      </thead>
      <tbody>
      ${props.items
        .map(
          (item: InvoiceItem) => `
        <tr>
          <td class="p-2 border border-gray-200 align-top">
            <div class="font-semibold mb-1">
              ${item.type === 'AIR' ? 'AIR' : item.type} ${item.passengerName || item.description || ''}
            </div>
            ${
              item.flightDetails && item.flightDetails.length > 0
                ? `
            <div class="text-[10px] text-gray-500 pl-3">Flight Detail (${item.flightDetails[0].flightNumber || 'N/A'}) ${item.flightDetails[0].airline || ''}</div>
            <div class="text-[10px] text-gray-500 pl-3 grid grid-cols-2 mt-1">
              <div><strong>Departure</strong><br>${item.flightDetails[0].departure || 'N/A'}</div>
              <div><strong>Arrivals</strong><br>${item.flightDetails[0].arrival || 'N/A'}</div>
            </div>
            `
                : ""
            }
          </td>
          <td class="p-2 border border-gray-200 align-top text-center">${item.quantity || 1}</td>
          <td class="p-2 border border-gray-200 align-top text-right">${formatCurrency(item.unitPrice)}</td>
          <td class="p-2 border border-gray-200 align-top text-right">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `
        )
        .join("")}

        <!-- Additional Charges -->
        ${props.additionalCharges && props.additionalCharges.length > 0 ? props.additionalCharges.map((charge: AdditionalCharge) => `
        <tr>
          <td class="p-2 border border-gray-200">${charge.description}</td>
          <td class="p-2 border border-gray-200 text-center">-</td>
          <td class="p-2 border border-gray-200 text-right">-</td>
          <td class="p-2 border border-gray-200 text-right">${formatCurrency(charge.amount)}</td>
        </tr>
        `).join('') : `
        <tr>
          <td class="p-2 border border-gray-200">ค่าใบอนุญาตการบินต้นทาง</td>
          <td class="p-2 border border-gray-200 text-center">-</td>
          <td class="p-2 border border-gray-200 text-right">-</td>
          <td class="p-2 border border-gray-200 text-right">0.00</td>
        </tr>
        <tr>
          <td class="p-2 border border-gray-200">ค่าธรรมเนียมการบิน</td>
          <td class="p-2 border border-gray-200 text-center">-</td>
          <td class="p-2 border border-gray-200 text-right">-</td>
          <td class="p-2 border border-gray-200 text-right">0.00</td>
        </tr>
        <tr>
          <td class="p-2 border border-gray-200">ค่าธรรมเนียมอื่นๆ</td>
          <td class="p-2 border border-gray-200 text-center">-</td>
          <td class="p-2 border border-gray-200 text-right">-</td>
          <td class="p-2 border border-gray-200 text-right">0.00</td>
        </tr>
        `}

        <!-- Totals -->
        <tr>
          <td colspan="3" class="p-2 border border-gray-200 text-right font-semibold">รวม</td>
          <td class="p-2 border border-gray-200 text-right font-semibold">${formatCurrency(props.subtotal)}</td>
        </tr>
        ${props.serviceFee && props.serviceFee > 0 ? `
        <tr>
          <td colspan="3" class="p-2 border border-gray-200 text-right">ค่าธรรมเนียมเติม</td>
          <td class="p-2 border border-gray-200 text-right">${formatCurrency(props.serviceFee)}</td>
        </tr>
        ` : ''}
        <tr class="bg-gray-100">
          <td colspan="3" class="p-2 border border-gray-200 text-right font-bold text-sm">ยอดรวมทั้งสิ้น</td>
          <td class="p-2 border border-gray-200 text-right font-bold text-sm">${formatCurrency(props.totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Text Description and QR Code Section -->
    <div class="grid grid-cols-[1fr_auto] gap-5 my-5 border border-gray-200 p-3">
      <div class="text-[10px]">
        <p class="mb-1.5 font-semibold">Text Description</p>
        <p class="mb-1">${props.amountInWords || 'AMOUNT IN WORDS'}</p>
        ${props.amountInWordsTh ? `<p class="mb-1">${props.amountInWordsTh}</p>` : ''}
        ${props.bookingNumber ? `<p class="mb-0.5">Booking No: ${props.bookingNumber}</p>` : ''}
        ${props.printingNumber ? `<p>Printing no. ${props.printingNumber}</p>` : ''}
      </div>
      ${
        props.qrCode
          ? `
      <div class="text-center">
        <img src="${props.qrCode}" alt="QR Code" class="w-[100px] h-[100px] border border-gray-300 p-1 bg-white">
      </div>
      `
          : ""
      }
    </div>

    <!-- Payment Method Section -->
    <div class="flex items-center gap-5 my-4 p-3 bg-white border border-gray-200 text-[11px]">
      <span class="font-semibold">ผู้รับเงิน (เซ็นเป็นหลักฐาน)..........................................................</span>
      <div class="flex gap-4">
        <label class="flex items-center gap-1">
          <div class="w-4 h-4 border-2 border-gray-300 rounded bg-white relative ${props.paymentMethod === 'EDC' ? 'payment-checkbox checked bg-blue-500 border-blue-500' : 'payment-checkbox'}"></div>
          <span>☐ EDC</span>
        </label>
        <label class="flex items-center gap-1">
          <div class="w-4 h-4 border-2 border-gray-300 rounded bg-white relative ${props.paymentMethod === 'CASH' ? 'payment-checkbox checked bg-blue-500 border-blue-500' : 'payment-checkbox'}"></div>
          <span>☐ CASH</span>
        </label>
        <label class="flex items-center gap-1">
          <div class="w-4 h-4 border-2 border-gray-300 rounded bg-white relative ${props.paymentMethod === 'TRANSFER' ? 'payment-checkbox checked bg-blue-500 border-blue-500' : 'payment-checkbox'}"></div>
          <span>☐ TRANSFER</span>
        </label>
        <label class="flex items-center gap-1">
          <div class="w-4 h-4 border-2 border-gray-300 rounded bg-white relative ${props.paymentMethod === 'CHEQUE' ? 'payment-checkbox checked bg-blue-500 border-blue-500' : 'payment-checkbox'}"></div>
          <span>☐ CHEQUE</span>
        </label>
      </div>
    </div>

    <!-- Bank Account Information -->
    ${props.bankName || props.bankAccountNumber ? `
    <div class="text-center p-3 bg-gray-50 border border-gray-200 my-3 text-[11px]">
      <p class="m-0">
        ${props.bankName ? `☐ ${props.bankName}` : ''}
        ${props.bankAccountNumber ? `เลขที่บัญชี ${props.bankAccountNumber}` : ''}
        ${props.bankAccountName ? ` ${props.bankAccountName}` : ''}
      </p>
    </div>
    ` : ''}


    <!-- Remarks -->
    ${
      props.remarks && props.remarks.length > 0
        ? `
      <div class="my-5">
        <h4 class="text-sm font-bold mb-2">Notes & Terms</h4>
        <ul class="list-disc pl-5 text-[10px] space-y-1">
          ${props.remarks
            .map((remark: string) => `<li>${remark}</li>`)
            .join("")}
        </ul>
      </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="mt-8 pt-3 border-t border-gray-200 text-center text-[9px] text-gray-400">
      <p class="my-1">https://ptsystem.bookings/passenger/example/url/path</p>
      <p class="my-1">1/2</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF from invoice data using the same HTML template
 * This ensures consistency between preview and PDF output
 */
export async function generatePDFFromHTMLServer(_data: PTSystemInvoiceData): Promise<string> {
  // PDF generation is handled by the print dialog component
  // This function is a placeholder for server-side PDF generation
  console.warn('Server-side PDF generation not yet implemented');
  throw new Error('Server-side PDF generation not yet implemented. Please use the print dialog.');
}

/**
 * Generate fallback preview HTML for error cases
 */
function generateFallbackPreviewHTML(data: PTSystemInvoiceData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Preview</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .invoice-preview {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      color: #333;
    }
    .total {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      text-align: right;
      margin-top: 20px;
      padding: 20px;
      background: #eff6ff;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="invoice-preview">
    <h1>Invoice Preview #${data.invoiceNumber}</h1>
    <div class="info-row">
      <span class="label">Type of invoice:</span>
      <span class="value">${
        data.type === "group" ? "Group Invoice" : "Individual Invoice"
      }</span>
    </div>
    <div class="info-row">
      <span class="label">PO Number:</span>
      <span class="value">${data.poNumber || "N/A"}</span>
    </div>
    <div class="info-row">
      <span class="label">Customer:</span>
      <span class="value">${data.customerName || "N/A"}</span>
    </div>
    <div class="info-row">
      <span class="label">Subtotal:</span>
      <span class="value">฿${(data.subtotal || 0).toLocaleString()}</span>
    </div>
    <div class="info-row">
      <span class="label">VAT (7%):</span>
      <span class="value">฿${(data.tax || 0).toLocaleString()}</span>
    </div>
    <div class="total">
      Total Amount: ฿${(data.totalAmount || 0).toLocaleString()}
    </div>
  </div>
</body>
</html>
  `;
}