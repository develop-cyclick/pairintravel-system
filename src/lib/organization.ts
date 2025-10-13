/**
 * Organization Utilities
 *
 * Helper functions for multi-tenant organization management
 */

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * Get the organization ID from the current session
 * Throws an error if not authenticated
 */
export async function getSessionOrganizationId(): Promise<string> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    throw new Error("Unauthorized: No active session")
  }

  if (!session.user.organizationId) {
    throw new Error("Unauthorized: No organization associated with user")
  }

  return session.user.organizationId
}

/**
 * Get the organization from the current session
 * Returns the full organization object
 */
export async function getSessionOrganization() {
  const organizationId = await getSessionOrganizationId()

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  })

  if (!organization) {
    throw new Error("Organization not found")
  }

  return organization
}

/**
 * Verify that a resource belongs to the current user's organization
 * Throws an error if the resource doesn't belong to the organization
 */
export async function verifyOrganizationAccess(resourceOrganizationId: string | null | undefined): Promise<void> {
  if (!resourceOrganizationId) {
    throw new Error("Resource does not have an organization")
  }

  const sessionOrganizationId = await getSessionOrganizationId()

  if (resourceOrganizationId !== sessionOrganizationId) {
    throw new Error("Forbidden: Resource belongs to a different organization")
  }
}

/**
 * Add organization filter to Prisma query
 * Returns an object with organizationId filter
 */
export async function getOrganizationFilter() {
  const organizationId = await getSessionOrganizationId()
  return { organizationId }
}

/**
 * Get user session with organization info
 * Returns null if not authenticated
 */
export async function getUserSession() {
  const session = await getServerSession(authOptions)
  return session
}

/**
 * Check if user belongs to an organization
 */
export async function hasOrganizationAccess(): Promise<boolean> {
  try {
    await getSessionOrganizationId()
    return true
  } catch {
    return false
  }
}

/**
 * Create organization-scoped data
 * Adds organizationId to the data object
 */
export async function withOrganization<T extends Record<string, any>>(data: T): Promise<T & { organizationId: string }> {
  const organizationId = await getSessionOrganizationId()
  return {
    ...data,
    organizationId
  }
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId: string) {
  const [
    userCount,
    customerCount,
    departmentCount,
    purchaseOrderCount,
    bookingCount,
    invoiceCount
  ] = await Promise.all([
    prisma.user.count({ where: { organizationId } }),
    prisma.customer.count({ where: { organizationId } }),
    // Departments are globally shared, count all active departments
    prisma.department.count({ where: { isActive: true } }),
    prisma.purchaseOrder.count({ where: { organizationId } }),
    prisma.booking.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId } })
  ])

  return {
    users: userCount,
    customers: customerCount,
    departments: departmentCount,
    purchaseOrders: purchaseOrderCount,
    bookings: bookingCount,
    invoices: invoiceCount
  }
}

/**
 * Validate organization code uniqueness
 */
export async function isOrganizationCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.organization.findUnique({
    where: { code },
    select: { id: true }
  })

  if (!existing) return true
  if (excludeId && existing.id === excludeId) return true

  return false
}
