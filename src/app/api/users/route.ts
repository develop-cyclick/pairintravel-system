import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  role: z.enum(["ADMIN", "AGENT", "VIEWER"]),
  organizationId: z.string()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Determine if user is super admin (DEFAULT org) or org admin
    const isSuperAdmin = session.user.organizationId === await prisma.organization.findUnique({
      where: { code: 'DEFAULT' },
      select: { id: true }
    }).then(org => org?.id)

    // Build query based on access level
    const whereClause = isSuperAdmin ? {} : { organizationId: session.user.organizationId }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            invoices: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Determine if user is super admin
    const defaultOrg = await prisma.organization.findUnique({
      where: { code: 'DEFAULT' },
      select: { id: true }
    })
    const isSuperAdmin = session.user.organizationId === defaultOrg?.id

    // Access control: org admins can only create users in their own organization
    if (!isSuperAdmin && validatedData.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: "You can only create users in your own organization" },
        { status: 403 }
      )
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: validatedData.organizationId }
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        organizationId: validatedData.organizationId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        createdAt: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}