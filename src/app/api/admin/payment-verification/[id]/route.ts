import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const verifyPaymentSchema = z.object({
  action: z.enum(['verify', 'reject']),
  verificationNotes: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()

    // Validate input
    const validationResult = verifyPaymentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { action, verificationNotes } = validationResult.data

    // Find payment verification
    const verification = await prisma.paymentVerification.findUnique({
      where: { id },
      include: {
        invoice: true
      }
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Payment verification not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (verification.status === 'VERIFIED' || verification.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Payment verification has already been processed' },
        { status: 409 }
      )
    }

    // Check if expired
    if (new Date() > verification.expiresAt) {
      return NextResponse.json(
        { error: 'Payment verification has expired' },
        { status: 410 }
      )
    }

    const now = new Date()
    const newStatus = action === 'verify' ? 'VERIFIED' : 'REJECTED'

    // Start transaction to update both verification and invoice
    const result = await prisma.$transaction(async (tx) => {
      // Update payment verification
      const updatedVerification = await tx.paymentVerification.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedBy: session.user.id,
          verifiedAt: now,
          verificationNotes
        }
      })

      // If verified, update invoice status to PAID
      if (action === 'verify') {
        await tx.invoice.update({
          where: { id: verification.invoice.id },
          data: {
            status: 'PAID',
            paidAt: verification.paymentDate || now
          }
        })
      }

      return updatedVerification
    })

    return NextResponse.json({
      message: `Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully`,
      verification: {
        id: result.id,
        status: result.status,
        verifiedBy: result.verifiedBy,
        verifiedAt: result.verifiedAt,
        verificationNotes: result.verificationNotes
      }
    })

  } catch (error) {
    console.error('Error processing payment verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params

    const verification = await prisma.paymentVerification.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            booking: {
              include: {
                passengers: {
                  include: {
                    customer: true
                  }
                }
              }
            },
            purchaseOrder: {
              include: {
                department: true,
                customer: true
              }
            }
          }
        }
      }
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Payment verification not found' },
        { status: 404 }
      )
    }

    const response = {
      id: verification.id,
      verificationToken: verification.verificationToken,
      invoiceNumber: verification.invoice.invoiceNumber,
      invoiceAmount: verification.invoice.totalAmount,
      paymentMethod: verification.paymentMethod,
      paymentAmount: verification.paymentAmount,
      paymentDate: verification.paymentDate,
      paymentReference: verification.paymentReference,
      paymentNotes: verification.paymentNotes,
      passengerName: verification.passengerName,
      passengerEmail: verification.passengerEmail,
      passengerPhone: verification.passengerPhone,
      status: verification.status,
      submittedAt: verification.submittedAt,
      verifiedBy: verification.verifiedBy,
      verifiedAt: verification.verifiedAt,
      verificationNotes: verification.verificationNotes,
      expiresAt: verification.expiresAt,
      ipAddress: verification.ipAddress,
      userAgent: verification.userAgent,
      bookingRef: verification.invoice.booking?.bookingRef,
      passengers: verification.invoice.booking?.passengers?.map(p => ({
        name: `${p.customer.firstName} ${p.customer.lastName}`,
        email: p.customer.email,
        phone: p.customer.phone
      })) || [],
      purchaseOrder: verification.invoice.purchaseOrder ? {
        poNumber: verification.invoice.purchaseOrder.poNumber,
        department: verification.invoice.purchaseOrder.department?.nameEn,
        customer: verification.invoice.purchaseOrder.customer ?
          `${verification.invoice.purchaseOrder.customer.firstName} ${verification.invoice.purchaseOrder.customer.lastName}` :
          null
      } : null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching payment verification details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}