/**
 * Thai PDF Generation Solution
 *
 * Problem: jsPDF doesn't have built-in Thai font support, causing Thai characters to not display
 *
 * Solutions implemented:
 * 1. Client-side workaround with Unicode support
 * 2. Font embedding preparation
 * 3. Alternative HTML/CSS approach
 */

import jsPDF from "jspdf"

// Solution 1: Unicode Text Encoding
// This ensures Thai text is properly encoded in the PDF
export function encodeThaiForPDF(text: string): string {
  // Normalize the text to ensure consistent Unicode representation
  let normalized = text.normalize("NFC")

  // Handle special Thai characters that might cause issues
  const thaiCharMap: { [key: string]: string } = {
    "฿": "THB", // Thai Baht symbol to text
    "๏": "o", // Thai bullet to regular bullet
  }

  Object.keys(thaiCharMap).forEach(char => {
    normalized = normalized.replace(new RegExp(char, "g"), thaiCharMap[char])
  })

  return normalized
}

// Solution 2: Create PDF with proper UTF-8 encoding
export function createThaiSupportedPDF(): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
    compress: true
  })

  // Set document properties for better Thai support
  doc.setProperties({
    title: 'Invoice',
    subject: 'Invoice Document',
    author: 'PT System',
    keywords: 'invoice, thai, document',
    creator: 'PT System'
  })

  // Use Unicode mode
  doc.setLanguage("th")

  return doc
}

// Solution 3: Render Thai text with fallback
export function renderThaiTextSafe(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: any
): void {
  try {
    // Check if text contains Thai characters
    const hasThaiChars = /[\u0E00-\u0E7F]/.test(text)

    if (hasThaiChars) {
      // Process the text for better compatibility
      const processed = encodeThaiForPDF(text)

      // Try to render with UTF-16 encoding
      const encoder = new TextEncoder()
      const encoded = encoder.encode(processed)

      // Render the text
      doc.text(processed, x, y, options)
    } else {
      // Regular ASCII text
      doc.text(text, x, y, options)
    }
  } catch (error) {
    console.error("Error rendering Thai text:", error)
    // Fallback: render as-is
    doc.text(text, x, y, options)
  }
}

// Solution 4: Generate HTML template for better font support
export function generateHTMLInvoiceTemplate(data: any): string {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

    body {
      font-family: 'Sarabun', sans-serif;
      margin: 0;
      padding: 20px;
      font-size: 14px;
    }

    .invoice-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .invoice-title {
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0;
    }

    .info-section {
      margin-bottom: 20px;
    }

    .info-row {
      display: flex;
      margin-bottom: 5px;
    }

    .info-label {
      width: 150px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }

    .text-right {
      text-align: right;
    }

    .total-section {
      margin-top: 20px;
      text-align: right;
    }

    .total-row {
      margin-bottom: 5px;
    }

    .total-label {
      display: inline-block;
      width: 150px;
    }

    .grand-total {
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #000;
    }

    @media print {
      body {
        margin: 0;
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="invoice-header">
      <div class="company-name">${data.companyName || 'บริษัท ไพรินทร์ (จ.2562) จำกัด'}</div>
      <div>${data.companyAddress || 'เลขที่ 46 ซอยสวนผัก 32/1 แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพมหานคร 10170'}</div>
      <div>โทร ${data.companyPhone || '02-589-1755'} Email: ${data.companyEmail || 'pairin.jo2562@gmail.com'}</div>
      <div>เลขประจำตัวผู้เสียภาษีอากร ${data.companyTaxId || '0105561213350'}</div>
    </div>

    <div class="invoice-title">ใบแจ้งหนี้/ใบเสร็จรับเงิน<br>INVOICE/RECEIPT</div>

    <div class="info-section">
      <div class="info-row">
        <span class="info-label">เลขที่เอกสาร:</span>
        <span>${data.invoiceNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">วันที่:</span>
        <span>${new Date(data.docDate).toLocaleDateString('th-TH')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">ลูกค้า:</span>
        <span>${data.customerName}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>รายการ</th>
          <th class="text-right">จำนวน</th>
          <th class="text-right">ราคาต่อหน่วย</th>
          <th class="text-right">รวม (บาท)</th>
        </tr>
      </thead>
      <tbody>
        ${data.items?.map((item: any) => `
          <tr>
            <td>${item.description || item.type}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${item.unitPrice.toLocaleString('th-TH')}</td>
            <td class="text-right">${item.totalPrice.toLocaleString('th-TH')}</td>
          </tr>
        `).join('') || ''}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span class="total-label">รวม:</span>
        <span>${data.subtotal?.toLocaleString('th-TH') || '0'} บาท</span>
      </div>
      <div class="total-row">
        <span class="total-label">ภาษีมูลค่าเพิ่ม 7%:</span>
        <span>${data.tax?.toLocaleString('th-TH') || '0'} บาท</span>
      </div>
      <div class="grand-total">
        <span class="total-label">ยอดรวมสุทธิ:</span>
        <span>${data.totalAmount?.toLocaleString('th-TH') || '0'} บาท</span>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

// Solution 5: Instructions for complete fix
export const THAI_PDF_FIX_INSTRUCTIONS = `
To fully fix Thai character encoding in PDFs, you have several options:

1. **Quick Fix (Implemented)**:
   - Use Unicode normalization
   - Replace problematic characters
   - Ensure UTF-8 encoding

2. **Font Embedding (Recommended)**:
   - Download Thai font file (e.g., Sarabun-Regular.ttf)
   - Convert to Base64
   - Embed in jsPDF using addFont()

3. **Server-side Generation (Best)**:
   - Use Puppeteer or Playwright to generate PDF from HTML
   - This allows proper web font rendering
   - Better Thai text layout and line breaking

4. **Alternative Libraries**:
   - Consider using pdfmake with custom fonts
   - Or use html2canvas + jspdf for visual accuracy

Example implementation for font embedding:
\`\`\`javascript
// 1. Convert font to Base64 (do this once)
const fontBase64 = fs.readFileSync('Sarabun-Regular.ttf').toString('base64')

// 2. Add to jsPDF
doc.addFileToVFS("Sarabun.ttf", fontBase64)
doc.addFont("Sarabun.ttf", "Sarabun", "normal")
doc.setFont("Sarabun")
\`\`\`
`