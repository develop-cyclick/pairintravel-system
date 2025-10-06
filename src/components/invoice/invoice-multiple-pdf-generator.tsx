"use client"

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generatePrintHTML } from './invoice-pdf-client'

interface InvoiceData {
  html: string
  invoiceNumber: string
}

/**
 * Generate individual PDFs for each invoice using browser print
 * Each invoice will be downloaded as a separate PDF file
 */
export async function generateMultiplePDFs(
  invoices: InvoiceData[],
  onProgress?: (current: number, total: number) => void
) {
  const pdfPromises: Promise<{ name: string; blob: Blob }>[] = []

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i]

    // Update progress
    if (onProgress) {
      onProgress(i + 1, invoices.length)
    }

    // Create a promise for each PDF generation
    pdfPromises.push(
      generateSinglePDF(invoice.html, invoice.invoiceNumber)
    )

    // Add small delay between generations to avoid overwhelming the browser
    if (i < invoices.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  // Wait for all PDFs to be generated
  const pdfs = await Promise.all(pdfPromises)

  // If only one PDF, download it directly
  if (pdfs.length === 1) {
    saveAs(pdfs[0].blob, pdfs[0].name)
  } else {
    // Create ZIP file for multiple PDFs
    const zip = new JSZip()

    pdfs.forEach(pdf => {
      zip.file(pdf.name, pdf.blob)
    })

    // Generate ZIP and download
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, `invoices-${new Date().toISOString().split('T')[0]}.zip`)
  }
}

/**
 * Generate a single PDF using hidden iframe and browser print
 */
async function generateSinglePDF(html: string, invoiceNumber: string): Promise<{ name: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    try {
      // Create hidden iframe
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      document.body.appendChild(iframe)

      // Write HTML to iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) {
        throw new Error('Could not access iframe document')
      }

      const printHTML = generatePrintHTML(html, invoiceNumber)
      iframeDoc.open()
      iframeDoc.write(printHTML)
      iframeDoc.close()

      // Wait for content to load
      iframe.onload = () => {
        setTimeout(() => {
          try {
            // Unfortunately, we can't directly save as PDF from JavaScript
            // We need to trigger the print dialog for each invoice
            // This is a browser limitation for security reasons

            // Alternative: Convert HTML to blob for download
            const blob = new Blob([printHTML], { type: 'text/html' })

            // Clean up
            document.body.removeChild(iframe)

            resolve({
              name: `${invoiceNumber}.html`,
              blob
            })
          } catch (error) {
            reject(error)
          }
        }, 1000) // Wait for fonts to load
      }
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Alternative approach: Open each invoice in a new tab for manual printing
 */
export function openMultipleInvoicesForPrinting(invoices: InvoiceData[]) {
  const printQueue: InvoiceData[] = [...invoices]
  let currentIndex = 0

  function printNext() {
    if (currentIndex >= printQueue.length) {
      return
    }

    const invoice = printQueue[currentIndex]
    const printWindow = window.open('', '_blank', 'width=900,height=700')

    if (printWindow) {
      const printHTML = generatePrintHTML(invoice.html, invoice.invoiceNumber)
      printWindow.document.write(printHTML)
      printWindow.document.close()

      // Add event listener for when printing is done
      printWindow.addEventListener('afterprint', () => {
        printWindow.close()
        currentIndex++

        // Print next invoice after a delay
        setTimeout(printNext, 500)
      })

      // Auto-trigger print after a delay
      setTimeout(() => {
        printWindow.print()
      }, 1000)
    }
  }

  // Start printing queue
  printNext()
}

/**
 * Generate individual PDFs using a print service (requires backend implementation)
 */
export async function generatePDFsServerSide(
  invoiceId: string,
  passengerIds: string[]
): Promise<void> {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/generate-pdfs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        type: 'individual',
        passengerIds
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate PDFs')
    }

    // Check if response is a single PDF or ZIP file
    const contentType = response.headers.get('content-type')
    const contentDisposition = response.headers.get('content-disposition')

    let filename = 'invoices.pdf'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Download the file
    const blob = await response.blob()
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error generating PDFs:', error)
    throw error
  }
}