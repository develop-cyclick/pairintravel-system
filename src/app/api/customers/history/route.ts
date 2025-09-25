import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || "all" // all, department, customer
    const limit = parseInt(searchParams.get("limit") || "20")

    const results: any[] = []

    // Search departments
    if (type === "all" || type === "department") {
      const departments = await prisma.department.findMany({
        where: {
          isActive: true,
          OR: search ? [
            { code: { contains: search, mode: "insensitive" } },
            { nameEn: { contains: search, mode: "insensitive" } },
            { nameTh: { contains: search, mode: "insensitive" } },
          ] : undefined
        },
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameTh: true,
          taxId: true,
          address: true,
          ministry: true,
          email: true,
          phone: true,
          contactPerson: true,
          _count: {
            select: {
              bookings: true,
              purchaseOrders: true
            }
          }
        },
        take: limit,
        orderBy: [
          { createdAt: "desc" }
        ]
      })

      results.push(...departments.map(dept => ({
        id: dept.id,
        type: "department",
        code: dept.code,
        name: dept.nameEn,
        nameEn: dept.nameEn,
        nameTh: dept.nameTh,
        taxId: dept.taxId,
        address: dept.address,
        ministry: dept.ministry,
        email: dept.email,
        phone: dept.phone,
        contactPerson: dept.contactPerson,
        usageCount: dept._count.purchaseOrders + dept._count.bookings
      })))
    }

    // Search customers
    if (type === "all" || type === "customer") {
      const customers = await prisma.customer.findMany({
        where: search ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { nationalId: { contains: search } },
            { passportNo: { contains: search } }
          ]
        } : undefined,
        select: {
          id: true,
          title: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationality: true,
          _count: {
            select: {
              bookings: true,
              tourPassengers: true,
              purchaseOrders: true
            }
          }
        },
        take: limit,
        orderBy: [
          { createdAt: "desc" }
        ]
      })

      results.push(...customers.map(customer => ({
        id: customer.id,
        type: "customer",
        name: `${customer.title} ${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        nationality: customer.nationality,
        usageCount: customer._count.purchaseOrders + customer._count.bookings + customer._count.tourPassengers
      })))
    }

    // Sort by usage count and limit
    results.sort((a, b) => b.usageCount - a.usageCount)
    const finalResults = results.slice(0, limit)

    // Get recent POs for context
    const recentPOs = await prisma.purchaseOrder.findMany({
      select: {
        id: true,
        poNumber: true,
        type: true,
        department: {
          select: {
            id: true,
            code: true,
            nameEn: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        createdAt: true
      },
      take: 5,
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      results: finalResults,
      recentPOs: recentPOs.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        type: po.type,
        entityType: po.department ? "department" : "customer",
        entityId: po.department?.id || po.customer?.id,
        entityName: po.department ? `${po.department.code} - ${po.department.nameEn}` : 
                   po.customer ? `${po.customer.firstName} ${po.customer.lastName}` : "Unknown",
        createdAt: po.createdAt
      }))
    })
  } catch (error) {
    console.error("Error fetching customer history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}