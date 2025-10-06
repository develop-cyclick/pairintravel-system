import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSessionOrganizationId, verifyOrganizationAccess } from '@/lib/organization'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const organizationId = await getSessionOrganizationId()

    const body = await request.json()
    const { airlinePNR, ticketNumber, isValidated } = body

    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      select: {
        id: true,
        organizationId: true,
        airlinePNR: true,
        ticketNumber: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        airlinePNR: airlinePNR || booking.airlinePNR,
        ticketNumber: ticketNumber || booking.ticketNumber,
        isValidated,
        validatedAt: isValidated ? new Date() : null,
        validatedBy: isValidated ? session.user.id : null
      }
    })

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    })
  } catch (error) {
    console.error('Error validating booking:', error)
    return NextResponse.json(
      { error: 'Failed to validate booking' },
      { status: 500 }
    )
  }
}