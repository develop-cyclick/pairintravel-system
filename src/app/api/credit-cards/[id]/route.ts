import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateCreditCardSchema = z.object({
  cardName: z.string().min(1).optional(),
  cardHolder: z.string().min(1).optional(),
  creditLimit: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  departmentId: z.string().nullable().optional(),
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

    const creditCard = await prisma.creditCard.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        _count: {
          select: { transactions: true }
        }
      }
    })

    if (!creditCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 })
    }

    const cardWithUsage = {
      ...creditCard,
      usagePercentage: ((creditCard.creditLimit - creditCard.availableCredit) / creditCard.creditLimit) * 100,
      transactionCount: creditCard._count.transactions
    }

    return NextResponse.json(cardWithUsage)
  } catch (error) {
    console.error("Error fetching credit card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can update credit cards
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateCreditCardSchema.parse(body)

    // Get current card data
    const currentCard = await prisma.creditCard.findUnique({
      where: { id: params.id }
    })

    if (!currentCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 })
    }

    // If credit limit is being changed, adjust available credit accordingly
    let updateData: any = { ...validatedData }
    
    if (validatedData.creditLimit && validatedData.creditLimit !== currentCard.creditLimit) {
      const usedCredit = currentCard.creditLimit - currentCard.availableCredit
      updateData.availableCredit = validatedData.creditLimit - usedCredit
      
      // Create adjustment transaction
      await prisma.creditCardTransaction.create({
        data: {
          cardId: params.id,
          transactionType: "ADJUSTMENT",
          amount: validatedData.creditLimit - currentCard.creditLimit,
          description: `Credit limit adjusted from ${currentCard.creditLimit} to ${validatedData.creditLimit}`,
          balanceBefore: currentCard.availableCredit,
          balanceAfter: updateData.availableCredit,
          createdBy: session.user.id
        }
      })
    }

    const creditCard = await prisma.creditCard.update({
      where: { id: params.id },
      data: updateData,
      include: {
        department: true
      }
    })

    return NextResponse.json(creditCard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating credit card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can delete credit cards
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if card has transactions (besides initial)
    const card = await prisma.creditCard.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })

    if (!card) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 })
    }

    if (card._count.transactions > 1) {
      // Instead of deleting, just deactivate
      await prisma.creditCard.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      return NextResponse.json({ message: "Credit card deactivated" })
    }

    // If only initial transaction, allow deletion
    await prisma.creditCard.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Credit card deleted successfully" })
  } catch (error) {
    console.error("Error deleting credit card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}