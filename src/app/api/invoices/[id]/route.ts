import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSessionOrganizationId } from "@/lib/organization"

// GET - Fetch single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = await getSessionOrganizationId()
    const { id } = await params

    // Try to find by ID first, then by invoice number (both filtered by organization)
    let invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        purchaseOrder: {
          include: {
            department: true,
            customer: true,
            bookings: {
              include: {
                passengers: {
                  include: {
                    customer: true
                  }
                }
              }
            },
            tourBookings: {
              include: {
                tourPackage: true,
                passengers: {
                  include: {
                    customer: true
                  }
                }
              }
            }
          }
        },
        user: true
      }
    })

    // If not found by ID, try by invoice number
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: id,
          organizationId
        },
        include: {
          purchaseOrder: {
            include: {
              department: true,
              customer: true,
              bookings: {
                include: {
                  passengers: {
                    include: {
                      customer: true
                    }
                  }
                }
              },
              tourBookings: {
                include: {
                  tourPackage: true,
                  passengers: {
                    include: {
                      customer: true
                    }
                  }
                }
              }
            }
          },
          user: true
        }
      })
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}