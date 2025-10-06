import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { getSessionOrganizationId } from "@/lib/organization"

const createCustomerSchema = z.object({
  title: z.string().transform(val => val || "Mr."),  // Default to Mr. if empty
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().transform(val => val || ""),  // Allow empty, transform to empty string
  nationalId: z.string().transform(val => val || null),  // Allow empty, transform to null
  passportNo: z.string().transform(val => val || null),  // Allow empty, transform to null
  governmentId: z.string().transform(val => val || null),  // Allow empty, transform to null
  governmentIdExpiryDate: z.string().transform(val => val || null),  // Allow empty, transform to null
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().transform(val => val || "Thai")  // Default to Thai if empty
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    let where: any = { organizationId }

    if (search && search.length >= 2) {
      where = {
        organizationId,
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { nationalId: { contains: search, mode: "insensitive" } },
          { passportNo: { contains: search, mode: "insensitive" } },
          { governmentId: { contains: search, mode: "insensitive" } }
        ]
      }
    }

    // If search params include pagination, return paginated results
    if (searchParams.has("page")) {
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            bookings: {
              include: {
                booking: {
                  include: {
                    flight: true
                  }
                }
              }
            }
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" }
        }),
        prisma.customer.count({ where })
      ])

      return NextResponse.json({
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    } else {
      // Simple search for dialog - return array directly
      const customers = await prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              bookings: true
            }
          }
        },
        take: limit,
        orderBy: { updatedAt: "desc" }
      })

      // Add booking count to each customer
      const customersWithBookingCount = customers.map(customer => ({
        ...customer,
        bookingCount: customer._count.bookings
      }))

      return NextResponse.json(customersWithBookingCount)
    }
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()

    const body = await request.json()
    const validatedData = createCustomerSchema.parse(body)

    // Check if customer already exists in this organization
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: validatedData.email,
        organizationId
      }
    })

    if (existingCustomer) {
      return NextResponse.json({ error: "Customer with this email already exists" }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        title: validatedData.title,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        nationality: validatedData.nationality,
        nationalId: validatedData.nationalId,
        passportNo: validatedData.passportNo,
        governmentId: validatedData.governmentId,
        governmentIdExpiryDate: validatedData.governmentIdExpiryDate ? new Date(validatedData.governmentIdExpiryDate) : null
      }
    })

    return NextResponse.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}