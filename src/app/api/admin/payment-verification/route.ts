import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where = status ? { status: status as any } : {}

    const [verifications, total] = await Promise.all([
      prisma.paymentVerification.findMany({
        where,
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
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.paymentVerification.count({ where })
    ])

    const formattedVerifications = verifications.map(v => ({
      id: v.id,
      verificationToken: v.verificationToken,
      invoiceNumber: v.invoice.invoiceNumber,
      invoiceAmount: v.invoice.totalAmount,
      paymentMethod: v.paymentMethod,
      paymentAmount: v.paymentAmount,
      paymentDate: v.paymentDate,
      paymentReference: v.paymentReference,
      paymentNotes: v.paymentNotes,
      passengerName: v.passengerName,
      passengerEmail: v.passengerEmail,
      passengerPhone: v.passengerPhone,
      status: v.status,
      submittedAt: v.submittedAt,
      verifiedBy: v.verifiedBy,
      verifiedAt: v.verifiedAt,
      verificationNotes: v.verificationNotes,
      expiresAt: v.expiresAt,
      bookingRef: v.invoice.booking?.bookingRef,
      poNumber: v.invoice.purchaseOrder?.poNumber,
      departmentName: v.invoice.purchaseOrder?.department?.nameEn,
      customerName: v.invoice.purchaseOrder?.customer ?
        `${v.invoice.purchaseOrder.customer.firstName} ${v.invoice.purchaseOrder.customer.lastName}` :
        null
    }))

    return NextResponse.json({
      verifications: formattedVerifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching payment verifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}