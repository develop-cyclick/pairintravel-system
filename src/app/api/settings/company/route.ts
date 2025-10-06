import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getCompanySettings, clearSettingsCache } from "@/lib/company-settings"
import { getSessionOrganizationId } from "@/lib/organization"
import { z } from "zod"

// Validation schema for company settings
const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyNameTh: z.string().min(1, "Company name (Thai) is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  companyPhone: z.string().min(1, "Company phone is required"),
  companyEmail: z.string().email("Invalid email address"),
  companyTaxId: z.string().min(1, "Tax ID is required"),
  logo: z.string().nullable().optional()
})

/**
 * GET - Fetch company settings
 * Returns current settings or defaults if none exist
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getCompanySettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching company settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT - Update company settings
 * Only accessible by ADMIN users
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update company settings" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = companySettingsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Get organization ID
    const organizationId = await getSessionOrganizationId()

    // Check if settings already exist for this organization
    const existingSettings = await prisma.companySettings.findUnique({
      where: { organizationId }
    })

    let settings
    if (existingSettings) {
      // Update existing settings
      settings = await prisma.companySettings.update({
        where: { organizationId },
        data: {
          companyName: data.companyName,
          companyNameTh: data.companyNameTh,
          companyAddress: data.companyAddress,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          companyTaxId: data.companyTaxId,
          logo: data.logo || null
        }
      })
    } else {
      // Create new settings
      settings = await prisma.companySettings.create({
        data: {
          organizationId,
          companyName: data.companyName,
          companyNameTh: data.companyNameTh,
          companyAddress: data.companyAddress,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          companyTaxId: data.companyTaxId,
          logo: data.logo || null
        }
      })
    }

    // Clear cache for this organization
    clearSettingsCache(organizationId)

    return NextResponse.json({
      message: "Company settings updated successfully",
      settings
    })
  } catch (error) {
    console.error("Error updating company settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
