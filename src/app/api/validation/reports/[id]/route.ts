import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
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

    const report = await prisma.validationReport.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        results: {
          include: {
            booking: {
              include: {
                passengers: {
                  include: {
                    customer: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error fetching validation report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch validation report' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const { resultId, action, notes, bookingId } = body

    if (!resultId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update validation result
    const updateData: any = {
      notes,
      updatedAt: new Date()
    }

    if (action === 'approve') {
      updateData.matchStatus = 'APPROVED'
      updateData.isApproved = true
      updateData.approvedBy = session.user.id
      updateData.approvedAt = new Date()

      // If bookingId is provided, link it and validate the booking
      if (bookingId) {
        updateData.bookingId = bookingId

        // Get the validation result to update the booking
        const result = await prisma.validationResult.findUnique({
          where: { id: resultId }
        })

        if (result) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              airlinePNR: result.airlineRef,
              ticketNumber: result.ticketNumber,
              isValidated: true,
              validatedAt: new Date(),
              validatedBy: session.user.id
            }
          })
        }
      }
    } else if (action === 'reject') {
      updateData.matchStatus = 'REJECTED'
      updateData.isApproved = false
      updateData.approvedBy = session.user.id
      updateData.approvedAt = new Date()
    }

    const result = await prisma.validationResult.update({
      where: { id: resultId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('Error updating validation result:', error)
    return NextResponse.json(
      { error: 'Failed to update validation result' },
      { status: 500 }
    )
  }
}