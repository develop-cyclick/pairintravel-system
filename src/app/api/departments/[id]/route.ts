import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateDepartmentSchema = z.object({
  code: z.string().min(2).max(20).optional(),
  nameEn: z.string().min(2).optional(),
  nameTh: z.string().min(2).optional(),
  taxId: z.string().optional(),
  ministry: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contactPerson: z.string().optional(),
  budget: z.number().optional(),
  isActive: z.boolean().optional()
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

    const department = await prisma.department.findUnique({
      where: {
        id: params.id
      },
      include: {
        _count: {
          select: {
            bookings: true
          }
        },
        bookings: {
          take: 10,
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error("Error fetching department:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AGENT")) {
      return NextResponse.json({ error: "Unauthorized: Admin or Agent access required" }, { status: 401 })
    }

    // Verify department exists
    const existing = await prisma.department.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateDepartmentSchema.parse(body)

    // If code is being updated, check if it's unique (globally)
    if (validatedData.code) {
      const existingDepartment = await prisma.department.findFirst({
        where: {
          code: validatedData.code,
          NOT: { id: params.id }
        }
      })

      if (existingDepartment) {
        return NextResponse.json({ error: "Department code already exists" }, { status: 400 })
      }
    }

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        email: validatedData.email === "" ? null : validatedData.email
      }
    })

    return NextResponse.json(department)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating department:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AGENT")) {
      return NextResponse.json({ error: "Unauthorized: Admin or Agent access required" }, { status: 401 })
    }

    // Check if department has bookings
    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            bookings: true,
            creditCards: true,
            purchaseOrders: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const hasRelatedData = department._count.bookings > 0 ||
                          department._count.creditCards > 0 ||
                          department._count.purchaseOrders > 0

    if (hasRelatedData) {
      // Instead of deleting, deactivate the department
      await prisma.department.update({
        where: { id: params.id },
        data: { isActive: false }
      })

      return NextResponse.json({
        message: "Department deactivated (has existing bookings, credit cards, or purchase orders)"
      })
    }

    // Delete department if no related data
    await prisma.department.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Department deleted successfully" })
  } catch (error) {
    console.error("Error deleting department:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}