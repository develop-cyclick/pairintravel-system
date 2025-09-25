import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createDepartmentSchema = z.object({
  code: z.string().min(2).max(20),
  nameEn: z.string().min(2),
  nameTh: z.string().min(2),
  taxId: z.string().optional(),
  ministry: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contactPerson: z.string().optional(),
  budget: z.number().optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const isActive = searchParams.get("isActive")
    const ministry = searchParams.get("ministry")

    const where: any = {}
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { nameTh: { contains: search, mode: "insensitive" } }
      ]
    }
    
    if (isActive !== null && isActive !== "all") {
      where.isActive = isActive === "true"
    }
    
    if (ministry && ministry !== "all") {
      where.ministry = ministry
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: [
        { isActive: "desc" },
        { code: "asc" }
      ]
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Allow both ADMIN and AGENT to create departments
    if (session.user.role !== "ADMIN" && session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createDepartmentSchema.parse(body)

    // Check if department code already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { code: validatedData.code }
    })

    if (existingDepartment) {
      return NextResponse.json({ error: "Department code already exists" }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        ...validatedData,
        email: validatedData.email || null,
        isActive: validatedData.isActive ?? true
      }
    })

    return NextResponse.json({ department })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating department:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}