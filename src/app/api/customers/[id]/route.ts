import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateCustomerSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nationalId: z.string().nullable().optional(),
  passportNo: z.string().nullable().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional()
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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          include: {
            booking: {
              include: {
                flight: true,
                invoice: true
              }
            }
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer:", error)
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

    const body = await request.json()
    const validatedData = updateCustomerSchema.parse(body)

    // Check if email is being changed and if it already exists
    if (validatedData.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id: params.id }
        }
      })

      if (existingCustomer) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
    }

    const updateData: any = {
      ...validatedData,
      nationalId: validatedData.nationalId === "" ? null : validatedData.nationalId,
      passportNo: validatedData.passportNo === "" ? null : validatedData.passportNo,
    }

    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth)
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating customer:", error)
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

    // Check if customer has any bookings
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    if (customer._count.bookings > 0) {
      return NextResponse.json({ 
        error: "Cannot delete customer with existing bookings" 
      }, { status: 400 })
    }

    await prisma.customer.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}