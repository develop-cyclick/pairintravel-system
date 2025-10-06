import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { getSessionOrganizationId, verifyOrganizationAccess } from "@/lib/organization"

const createTransactionSchema = z.object({
  transactionType: z.enum(["CHARGE", "PAYMENT", "REFUND", "ADJUSTMENT"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  referenceNumber: z.string().optional(),
  purchaseOrderId: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()

    // Verify card belongs to user's organization
    const card = await prisma.creditCard.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      select: { id: true }
    })

    if (!card) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const type = searchParams.get("type") as any

    const where: any = { cardId: params.id }
    if (type) {
      where.transactionType = type
    }

    const transactions = await prisma.creditCardTransaction.findMany({
      where,
      include: {
        purchaseOrder: {
          select: {
            poNumber: true,
            type: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    })

    const total = await prisma.creditCardTransaction.count({ where })

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can create manual transactions
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const organizationId = await getSessionOrganizationId()

    const body = await request.json()
    const validatedData = createTransactionSchema.parse(body)

    // Get current card and verify organization access
    const card = await prisma.creditCard.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      select: {
        id: true,
        organizationId: true,
        creditLimit: true,
        availableCredit: true
      }
    })

    if (!card) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 })
    }

    // Calculate new balance based on transaction type
    let newAvailableCredit = card.availableCredit

    switch (validatedData.transactionType) {
      case "CHARGE":
        newAvailableCredit -= validatedData.amount
        if (newAvailableCredit < 0) {
          return NextResponse.json({ error: "Insufficient credit" }, { status: 400 })
        }
        break
      case "PAYMENT":
      case "REFUND":
        newAvailableCredit += validatedData.amount
        if (newAvailableCredit > card.creditLimit) {
          newAvailableCredit = card.creditLimit
        }
        break
      case "ADJUSTMENT":
        // Adjustment can go either way
        newAvailableCredit += validatedData.amount
        break
    }

    // Create transaction and update card in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.creditCardTransaction.create({
        data: {
          cardId: params.id,
          ...validatedData,
          balanceBefore: card.availableCredit,
          balanceAfter: newAvailableCredit,
          createdBy: session.user.id
        }
      })

      const updatedCard = await tx.creditCard.update({
        where: { id: params.id },
        data: { availableCredit: newAvailableCredit }
      })

      return { transaction, updatedCard }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}