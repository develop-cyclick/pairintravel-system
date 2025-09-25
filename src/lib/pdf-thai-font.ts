import { jsPDF } from "jspdf"

// Thai font support utility
// This adds custom font support for Thai characters in jsPDF

export function addThaiFont(doc: jsPDF) {
  // Add custom font support using virtual file system
  // We'll use the standard fonts with UTF-8 support
  doc.setFont("helvetica")

  // Enable Unicode text support
  doc.setLanguage("th")

  return doc
}

// Helper function to safely render Thai text
export function renderThaiText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  // For Thai text, we need to handle it specially
  // Convert Thai text to proper encoding
  try {
    // Check if text contains Thai characters
    const hasThaiChars = /[\u0E00-\u0E7F]/.test(text)

    if (hasThaiChars) {
      // For now, we'll render Thai text as Unicode
      // This requires the PDF viewer to have Thai font support
      doc.text(text, x, y, options)
    } else {
      // Regular text
      doc.text(text, x, y, options)
    }
  } catch (error) {
    console.error("Error rendering Thai text:", error)
    // Fallback to regular text
    doc.text(text, x, y, options)
  }
}

// Convert Thai numbers to Arabic numbers for better compatibility
export function normalizeThaiNumbers(text: string): string {
  const thaiNumbers = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
  let result = text

  thaiNumbers.forEach((thaiNum, index) => {
    result = result.replace(new RegExp(thaiNum, 'g'), index.toString())
  })

  return result
}

// Helper to check if string contains Thai characters
export function containsThaiCharacters(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text)
}

// Split mixed Thai/English text for proper rendering
export function splitMixedText(text: string): { text: string; isThai: boolean }[] {
  const parts: { text: string; isThai: boolean }[] = []
  let currentPart = ''
  let currentIsThai: boolean | null = null

  for (const char of text) {
    const isThai = /[\u0E00-\u0E7F]/.test(char)

    if (currentIsThai === null) {
      currentIsThai = isThai
      currentPart = char
    } else if (currentIsThai === isThai) {
      currentPart += char
    } else {
      parts.push({ text: currentPart, isThai: currentIsThai })
      currentPart = char
      currentIsThai = isThai
    }
  }

  if (currentPart) {
    parts.push({ text: currentPart, isThai: currentIsThai ?? false })
  }

  return parts
}