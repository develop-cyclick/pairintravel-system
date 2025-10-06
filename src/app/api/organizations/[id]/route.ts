import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/organizations/[id] - Get single organization (ADMIN only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can view organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            bookings: true,
            departments: true,
            invoices: true,
            purchaseOrders: true
          }
        }
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

// PUT /api/organizations/[id] - Update organization (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can update organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, taxId, address, phone, email, isActive } = body

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: params.id }
    })

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // If code is being changed, check if new code already exists
    if (code && code !== existingOrg.code) {
      const codeExists = await prisma.organization.findUnique({
        where: { code }
      })

      if (codeExists) {
        return NextResponse.json(
          { error: 'Organization code already exists' },
          { status: 400 }
        )
      }
    }

    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(taxId && { taxId }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    })

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}

// DELETE /api/organizations/[id] - Delete organization (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can delete organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            bookings: true
          }
        }
      }
    })

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Prevent deletion if organization has users, customers, or bookings
    if (existingOrg._count.users > 0 || existingOrg._count.customers > 0 || existingOrg._count.bookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with existing users, customers, or bookings. Please transfer or delete them first.' },
        { status: 400 }
      )
    }

    await prisma.organization.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Organization deleted successfully' })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
