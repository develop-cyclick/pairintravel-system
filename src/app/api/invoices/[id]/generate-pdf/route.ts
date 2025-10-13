import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSessionOrganizationId } from "@/lib/organization"
import { transformInvoiceToPDFData } from "@/lib/invoice-data-transformer"
import { renderInvoiceToHTML, validateInvoiceData } from "@/lib/htmldocs-render"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { uploadPDFToR2, getSignedDownloadUrl } from "@/lib/cloudflare"

/**
 * POST /api/invoices/[id]/generate-pdf
 * Generate PDF for invoice and store in Cloudflare R2
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()
    const { id } = await params

    console.log(`[PDF Generation] Starting for invoice ID: ${id}, user: ${session.user.email}`)

    // 2. Verify invoice exists and user has access
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId
      },
      select: {
        id: true,
        invoiceNumber: true,
        organizationId: true,
        pdfUrl: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    console.log(`[PDF Generation] Invoice found: ${invoice.invoiceNumber}`)

    // 3. Transform invoice data
    console.log('[PDF Generation] Transforming invoice data...')
    const invoiceData = await transformInvoiceToPDFData(invoice.id)

    // 4. Validate invoice data
    const validation = validateInvoiceData(invoiceData)
    if (!validation.valid) {
      console.error('[PDF Generation] Validation failed:', validation.errors)
      return NextResponse.json(
        { error: "Invalid invoice data", details: validation.errors },
        { status: 400 }
      )
    }

    // 5. Render invoice to HTML
    console.log('[PDF Generation] Rendering HTML...')
    const html = await renderInvoiceToHTML(invoiceData)

    // 6. Generate PDF from HTML
    console.log('[PDF Generation] Generating PDF with Puppeteer...')
    const startTime = Date.now()
    const pdfBuffer = await generateInvoicePDF(html)
    const generationTime = Date.now() - startTime
    console.log(`[PDF Generation] PDF generated in ${generationTime}ms, size: ${pdfBuffer.length} bytes`)

    // 7. Upload PDF to Cloudflare R2
    console.log('[PDF Generation] Uploading to Cloudflare R2...')
    const uploadResult = await uploadPDFToR2(
      pdfBuffer,
      invoice.invoiceNumber,
      invoice.organizationId,
      {
        userId: session.user.id,
        generatedAt: new Date().toISOString(),
        invoiceId: invoice.id
      }
    )
    console.log(`[PDF Generation] Uploaded to R2: ${uploadResult.key}`)

    // 8. Update invoice with PDF URL and metadata
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfUrl: uploadResult.url,
        pdfGeneratedAt: new Date(),
        pdfGeneratedBy: session.user.id,
        updatedAt: new Date()
      }
    })

    console.log(`[PDF Generation] Invoice updated with PDF URL`)

    // 9. Generate presigned download URL (1 hour expiry)
    const downloadUrl = await getSignedDownloadUrl(uploadResult.key, 3600)

    // 10. Return success response
    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        pdfUrl: updatedInvoice.pdfUrl
      },
      pdf: {
        url: uploadResult.url,
        downloadUrl,
        key: uploadResult.key,
        size: pdfBuffer.length,
        generationTime: `${generationTime}ms`
      },
      message: "PDF generated successfully"
    })

  } catch (error) {
    console.error('[PDF Generation] Error:', error)

    // Return detailed error for debugging (in development)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
        ...(isDevelopment && { stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invoices/[id]/generate-pdf
 * Check if PDF exists and return status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()
    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId
      },
      select: {
        id: true,
        invoiceNumber: true,
        pdfUrl: true,
        updatedAt: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({
      invoiceNumber: invoice.invoiceNumber,
      hasPDF: !!invoice.pdfUrl,
      pdfUrl: invoice.pdfUrl,
      lastUpdated: invoice.updatedAt
    })

  } catch (error) {
    console.error('[PDF Status Check] Error:', error)
    return NextResponse.json(
      { error: "Failed to check PDF status" },
      { status: 500 }
    )
  }
}
