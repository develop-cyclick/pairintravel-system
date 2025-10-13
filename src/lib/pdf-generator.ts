import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

/**
 * Generate PDF from HTML string using Puppeteer
 * Optimized for Vercel serverless environment
 */
export async function generatePDFFromHTML(html: string, options?: PDFGenerationOptions): Promise<Buffer> {
  let browser = null

  try {
    // Configure Chromium for serverless environment
    const isProduction = process.env.NODE_ENV === 'production'

    // Launch browser
    browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: isProduction
        ? await chromium.executablePath()
        : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome',
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    })

    // Create new page
    const page = await browser.newPage()

    // Set content
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'load'],
      timeout: options?.timeout || 30000,
    })

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready')

    // Generate PDF
    const pdf = await page.pdf({
      format: options?.format || 'A4',
      margin: options?.margin || {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      printBackground: true,
      preferCSSPageSize: true,
    })

    return Buffer.from(pdf)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'))
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Generate invoice PDF with retry logic
 */
export async function generateInvoicePDF(html: string): Promise<Buffer> {
  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generatePDFFromHTML(html, {
        format: 'A4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        timeout: 30000,
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      if (attempt < maxRetries) {
        console.log(`PDF generation attempt ${attempt + 1} failed, retrying...`)
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  throw new Error(`Failed to generate PDF after ${maxRetries + 1} attempts: ${lastError?.message}`)
}

/**
 * PDF generation options
 */
export interface PDFGenerationOptions {
  format?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal'
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  timeout?: number
  landscape?: boolean
}

/**
 * Validate HTML before PDF generation
 */
export function validateInvoiceHTML(html: string): { valid: boolean; error?: string } {
  if (!html || html.trim().length === 0) {
    return { valid: false, error: 'HTML content is empty' }
  }

  if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
    return { valid: false, error: 'Invalid HTML structure' }
  }

  return { valid: true }
}
