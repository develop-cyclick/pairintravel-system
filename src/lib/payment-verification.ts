import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

export interface CreatePaymentVerificationParams {
  invoiceId: string
  expirationHours?: number
}

export async function createPaymentVerification({
  invoiceId,
  expirationHours = 72 // Default 3 days
}: CreatePaymentVerificationParams) {
  // Generate a secure random token
  const token = randomBytes(32).toString('hex')

  // Calculate expiration time
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expirationHours)

  // Create payment verification record
  const verification = await prisma.paymentVerification.create({
    data: {
      invoiceId,
      verificationToken: token,
      expiresAt,
      status: 'PENDING'
    }
  })

  return verification
}

export function generatePaymentVerificationUrl(token: string, baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'): string {
  return `${baseUrl}/payment-verification/${token}`
}

export interface PaymentVerificationQRData {
  type: 'PAYMENT_VERIFICATION'
  token: string
  invoiceNumber: string
  amount: number
  expiresAt: string
}

export function createPaymentVerificationQRData(
  token: string,
  invoiceNumber: string,
  amount: number,
  expiresAt: Date
): PaymentVerificationQRData {
  return {
    type: 'PAYMENT_VERIFICATION',
    token,
    invoiceNumber,
    amount,
    expiresAt: expiresAt.toISOString()
  }
}

export async function getActivePaymentVerification(invoiceId: string) {
  return await prisma.paymentVerification.findFirst({
    where: {
      invoiceId,
      expiresAt: {
        gt: new Date()
      },
      status: {
        in: ['PENDING']
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function validatePaymentVerificationToken(token: string) {
  const verification = await prisma.paymentVerification.findUnique({
    where: { verificationToken: token },
    include: {
      invoice: true
    }
  })

  if (!verification) {
    return { valid: false, error: 'Invalid token' }
  }

  if (new Date() > verification.expiresAt) {
    return { valid: false, error: 'Token expired' }
  }

  if (verification.status === 'VERIFIED') {
    return { valid: false, error: 'Already verified' }
  }

  if (verification.status === 'REJECTED') {
    return { valid: false, error: 'Payment rejected' }
  }

  if (verification.status === 'EXPIRED') {
    return { valid: false, error: 'Token expired' }
  }

  return { valid: true, verification }
}