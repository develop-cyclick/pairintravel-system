import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    // Find payment verification by token
    const verification = await prisma.paymentVerification.findUnique({
      where: { verificationToken: token },
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
        { error: 'Invalid verification token' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (new Date() > verification.expiresAt) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 410 }
      )
    }

    // Check if already verified
    if (verification.status === 'VERIFIED') {
      return NextResponse.json(
        { error: 'Payment has already been verified' },
        { status: 409 }
      )
    }

    // Return verification details (excluding sensitive information)
    const response = {
      id: verification.id,
      invoiceNumber: verification.invoice.invoiceNumber,
      amount: verification.invoice.totalAmount,
      status: verification.status,
      expiresAt: verification.expiresAt,
      bookingRef: verification.invoice.booking?.bookingRef || 'N/A',
      passengers: verification.invoice.booking?.passengers?.map(p => ({
        name: `${p.customer.firstName} ${p.customer.lastName}`,
        email: p.customer.email
      })) || [],
      purchaseOrder: verification.invoice.purchaseOrder ? {
        poNumber: verification.invoice.purchaseOrder.poNumber,
        department: verification.invoice.purchaseOrder.department?.nameEn,
        customer: verification.invoice.purchaseOrder.customer ?
          `${verification.invoice.purchaseOrder.customer.firstName} ${verification.invoice.purchaseOrder.customer.lastName}` :
          null
      } : null,
      // Include existing payment info if resubmitting
      paymentMethod: verification.paymentMethod,
      paymentAmount: verification.paymentAmount,
      paymentDate: verification.paymentDate,
      paymentReference: verification.paymentReference,
      paymentNotes: verification.paymentNotes,
      passengerName: verification.passengerName,
      passengerEmail: verification.passengerEmail,
      passengerPhone: verification.passengerPhone
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching payment verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}