import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createCreditCardSchema = z.object({
  cardNumber: z.string().min(15).max(19),
  cardName: z.string().min(1),
  cardType: z.enum(["VISA", "MASTERCARD", "AMEX", "JCB", "UNIONPAY", "OTHER"]),
  cardHolder: z.string().min(1),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
  creditLimit: z.number().positive(),
  departmentId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get("active") !== "false"
    const departmentId = searchParams.get("departmentId")

    const where: any = { isActive }
    if (departmentId) {
      where.departmentId = departmentId
    }

    const creditCards = await prisma.creditCard.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Calculate usage percentage for each card
    const cardsWithUsage = creditCards.map(card => ({
      ...card,
      usagePercentage: ((card.creditLimit - card.availableCredit) / card.creditLimit) * 100,
      transactionCount: card._count.transactions
    }))

    return NextResponse.json(cardsWithUsage)
  } catch (error) {
    console.error("Error fetching credit cards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can create credit cards
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createCreditCardSchema.parse(body)

    // Check if card number already exists
    const existingCard = await prisma.creditCard.findUnique({
      where: { cardNumber: validatedData.cardNumber }
    })

    if (existingCard) {
      return NextResponse.json({ error: "Credit card number already exists" }, { status: 400 })
    }

    const creditCard = await prisma.creditCard.create({
      data: {
        ...validatedData,
        departmentId: validatedData.departmentId || null,
        availableCredit: validatedData.creditLimit, // Initially, available credit equals credit limit
      },
      include: {
        department: true
      }
    })

    // Create initial transaction
    await prisma.creditCardTransaction.create({
      data: {
        cardId: creditCard.id,
        transactionType: "ADJUSTMENT",
        amount: validatedData.creditLimit,
        description: "Initial credit limit",
        balanceBefore: 0,
        balanceAfter: validatedData.creditLimit,
        createdBy: session.user.id
      }
    })

    return NextResponse.json(creditCard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating credit card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}