import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const paymentSubmissionSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paymentAmount: z.number().positive('Payment amount must be positive'),
  paymentDate: z.string().datetime('Invalid payment date'),
  paymentReference: z.string().optional(),
  paymentNotes: z.string().optional(),
  passengerName: z.string().min(1, 'Passenger name is required'),
  passengerEmail: z.string().email('Invalid email address'),
  passengerPhone: z.string().min(1, 'Phone number is required'),
  attachmentUrls: z.array(z.string().url()).optional(),
  attachmentMetadata: z.array(z.object({
    fileName: z.string(),
    fileSize: z.number(),
    fileType: z.string(),
    uploadedAt: z.string()
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = paymentSubmissionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Get client IP and user agent for security
    const clientIP = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Find and validate payment verification
    const verification = await prisma.paymentVerification.findUnique({
      where: { verificationToken: data.token },
      include: {
        invoice: true
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

    // Validate payment amount matches invoice amount
    const amountDifference = Math.abs(data.paymentAmount - verification.invoice.totalAmount)
    const tolerancePercentage = 0.01 // 1% tolerance
    const tolerance = verification.invoice.totalAmount * tolerancePercentage

    if (amountDifference > tolerance) {
      return NextResponse.json(
        {
          error: 'Payment amount does not match invoice total',
          invoiceAmount: verification.invoice.totalAmount,
          submittedAmount: data.paymentAmount
        },
        { status: 400 }
      )
    }

    // Update payment verification with submitted information
    const updatedVerification = await prisma.paymentVerification.update({
      where: { id: verification.id },
      data: {
        paymentMethod: data.paymentMethod,
        paymentAmount: data.paymentAmount,
        paymentDate: new Date(data.paymentDate),
        paymentReference: data.paymentReference,
        paymentNotes: data.paymentNotes,
        passengerName: data.passengerName,
        passengerEmail: data.passengerEmail,
        passengerPhone: data.passengerPhone,
        ipAddress: clientIP,
        userAgent: userAgent,
        submittedAt: new Date(),
        attachmentUrls: data.attachmentUrls || [],
        attachmentMetadata: data.attachmentMetadata || [],
        status: 'PENDING' // Set to pending for admin review
      }
    })

    return NextResponse.json({
      message: 'Payment information submitted successfully',
      verificationId: updatedVerification.id,
      status: updatedVerification.status,
      submittedAt: updatedVerification.submittedAt
    })

  } catch (error) {
    console.error('Error submitting payment verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}