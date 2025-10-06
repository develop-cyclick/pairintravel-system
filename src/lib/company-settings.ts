import { prisma } from "./db"
import { getSessionOrganizationId } from "./organization"

export interface CompanySettingsData {
  companyName: string
  companyNameTh: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyTaxId: string
  logo?: string | null
}

// Default company settings as fallback
const DEFAULT_COMPANY_SETTINGS: CompanySettingsData = {
  companyName: "PT System Co., Ltd.",
  companyNameTh: "บริษัท พีที ซิสเต็ม จำกัด",
  companyAddress: "Bangkok, Thailand",
  companyPhone: "02-XXX-XXXX",
  companyEmail: "info@ptsystem.com",
  companyTaxId: "0105561213350",
  logo: null
}

// In-memory cache for company settings (per organization)
const settingsCache = new Map<string, { data: CompanySettingsData; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Get company settings from database with caching
 * For multi-tenant: fetches settings for the current user's organization
 * Returns default settings if no settings exist in database
 */
export async function getCompanySettings(organizationId?: string): Promise<CompanySettingsData> {
  const now = Date.now()

  // Get organization ID (either provided or from session)
  let orgId = organizationId
  if (!orgId) {
    try {
      orgId = await getSessionOrganizationId()
    } catch (error) {
      // If no session, return defaults
      console.warn("No organization context available, returning default settings")
      return DEFAULT_COMPANY_SETTINGS
    }
  }

  // Check cache for this organization
  const cached = settingsCache.get(orgId)
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Fetch settings for this organization
    const settings = await prisma.companySettings.findUnique({
      where: { organizationId: orgId }
    })

    if (settings) {
      const settingsData: CompanySettingsData = {
        companyName: settings.companyName,
        companyNameTh: settings.companyNameTh,
        companyAddress: settings.companyAddress,
        companyPhone: settings.companyPhone,
        companyEmail: settings.companyEmail,
        companyTaxId: settings.companyTaxId,
        logo: settings.logo
      }

      // Update cache for this organization
      settingsCache.set(orgId, { data: settingsData, timestamp: now })

      return settingsData
    }

    // If no settings exist, return defaults
    return DEFAULT_COMPANY_SETTINGS
  } catch (error) {
    console.error("Error fetching company settings:", error)
    // Return defaults on error
    return DEFAULT_COMPANY_SETTINGS
  }
}

/**
 * Clear the settings cache
 * Should be called after updating settings
 * @param organizationId - Optional organization ID to clear specific cache, or all if not provided
 */
export function clearSettingsCache(organizationId?: string) {
  if (organizationId) {
    settingsCache.delete(organizationId)
  } else {
    settingsCache.clear()
  }
}

/**
 * Get default company settings
 */
export function getDefaultCompanySettings(): CompanySettingsData {
  return { ...DEFAULT_COMPANY_SETTINGS }
}
