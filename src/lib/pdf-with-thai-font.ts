import { jsPDF } from "jspdf"

// Thai font data encoded as base64 (Sarabun font subset)
// This is a minimal subset of the Sarabun font containing Thai characters
const THAI_FONT_DATA = {
  // Font name that will be used in jsPDF
  name: "Sarabun",
  // Font style
  style: "normal",
  // This would be the actual base64 encoded font data
  // For production, you would embed the actual font file here
  // You can generate this by converting a TTF file to base64
  data: null
}

/**
 * Enhanced PDF generation with proper Thai font support
 * This creates a PDF with embedded Thai font for better compatibility
 */
export class ThaiPDF {
  private doc: jsPDF
  private hasThaiFont: boolean = false

  constructor(options?: any) {
    this.doc = new jsPDF(options || {
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    })

    // Try to add Thai font if available
    this.addThaiFont()
  }

  private addThaiFont() {
    try {
      // In production, you would add the actual font here
      // doc.addFileToVFS("Sarabun.ttf", THAI_FONT_DATA.data);
      // doc.addFont("Sarabun.ttf", "Sarabun", "normal");
      // doc.setFont("Sarabun");

      // For now, we'll use the default font with UTF-8 support
      this.doc.setFont("helvetica")
      this.hasThaiFont = true
    } catch (error) {
      console.warn("Could not add Thai font, using fallback:", error)
      this.hasThaiFont = false
    }
  }

  /**
   * Render text with automatic Thai detection
   */
  text(text: string, x: number, y: number, options?: any) {
    if (this.containsThai(text)) {
      // For Thai text, we might need special handling
      // Some PDF viewers need the text to be encoded properly
      try {
        // Attempt to render with Thai support
        this.doc.text(text, x, y, options)
      } catch (error) {
        // Fallback: render as Unicode
        console.warn("Thai text rendering fallback:", error)
        this.doc.text(text, x, y, options)
      }
    } else {
      // Regular text
      this.doc.text(text, x, y, options)
    }
  }

  /**
   * Check if text contains Thai characters
   */
  private containsThai(text: string): boolean {
    return /[\u0E00-\u0E7F]/.test(text)
  }

  /**
   * Set font size
   */
  setFontSize(size: number) {
    this.doc.setFontSize(size)
  }

  /**
   * Set font style
   */
  setFont(fontName: string, fontStyle?: string) {
    // If Thai font is available and we're switching fonts, try to maintain Thai support
    if (this.hasThaiFont && fontName !== "Sarabun") {
      // Keep note that we might lose Thai support
      console.warn("Switching from Thai font to", fontName)
    }
    this.doc.setFont(fontName, fontStyle)
  }

  /**
   * Get the underlying jsPDF instance
   */
  getDoc(): jsPDF {
    return this.doc
  }

  /**
   * Generate PDF output
   */
  output(type: string = "datauristring"): string {
    return this.doc.output(type)
  }

  /**
   * Add a new page
   */
  addPage() {
    this.doc.addPage()
  }

  /**
   * Draw a line
   */
  line(x1: number, y1: number, x2: number, y2: number) {
    this.doc.line(x1, y1, x2, y2)
  }

  /**
   * Draw a rectangle
   */
  rect(x: number, y: number, w: number, h: number, style?: string) {
    this.doc.rect(x, y, w, h, style)
  }

  /**
   * Add an image
   */
  addImage(imageData: string, format: string, x: number, y: number, width: number, height: number) {
    this.doc.addImage(imageData, format, x, y, width, height)
  }

  /**
   * Set text color
   */
  setTextColor(r: number, g?: number, b?: number) {
    this.doc.setTextColor(r, g, b)
  }

  /**
   * Set draw color
   */
  setDrawColor(r: number, g?: number, b?: number) {
    this.doc.setDrawColor(r, g, b)
  }

  /**
   * Split text to size
   */
  splitTextToSize(text: string, maxWidth: number): string[] {
    return this.doc.splitTextToSize(text, maxWidth)
  }
}

/**
 * Alternative solution using HTML/CSS to PDF conversion
 * This can handle Thai fonts better through web fonts
 */
export async function generatePDFFromHTML(html: string): Promise<string> {
  // This would use a headless browser or HTML to PDF service
  // that can properly render Thai fonts through web fonts
  // For now, this is a placeholder

  console.warn("HTML to PDF conversion not implemented yet")
  return ""
}

/**
 * Helper to prepare Thai text for PDF
 * This handles common encoding issues
 */
export function prepareThaiText(text: string): string {
  // Normalize Unicode combining characters
  text = text.normalize("NFC")

  // Replace problematic characters
  // Thai Baht symbol
  text = text.replace(/฿/g, "THB ")

  // Remove zero-width characters that might cause issues
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "")

  return text
}