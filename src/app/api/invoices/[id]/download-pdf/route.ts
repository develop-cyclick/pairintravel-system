import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSessionOrganizationId } from "@/lib/organization"
import { getSignedDownloadUrl } from "@/lib/cloudflare"

/**
 * GET /api/invoices/[id]/download-pdf
 * Get presigned download URL for invoice PDF
 * If PDF doesn't exist, return 404 with option to generate
 */
export async function GET(
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

    // 2. Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId
      },
      select: {
        id: true,
        invoiceNumber: true,
        pdfUrl: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // 3. Check if PDF exists
    if (!invoice.pdfUrl) {
      return NextResponse.json(
        {
          error: "PDF not generated",
          message: "Please generate the PDF first",
          invoiceNumber: invoice.invoiceNumber,
          needsGeneration: true
        },
        { status: 404 }
      )
    }

    // 4. Extract key from URL
    // URL format: https://xxx.r2.cloudflarestorage.com/invoices/{orgId}/{filename}.pdf
    const key = invoice.pdfUrl.split('.com/').pop()
    if (!key) {
      return NextResponse.json(
        { error: "Invalid PDF URL format" },
        { status: 500 }
      )
    }

    // 5. Generate presigned download URL (1 hour expiry)
    const downloadUrl = await getSignedDownloadUrl(key, 3600)

    // 6. Return download URL
    return NextResponse.json({
      invoiceNumber: invoice.invoiceNumber,
      downloadUrl,
      expiresIn: 3600, // seconds
      pdfUrl: invoice.pdfUrl
    })

  } catch (error) {
    console.error('[PDF Download] Error:', error)
    return NextResponse.json(
      {
        error: "Failed to generate download URL",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
