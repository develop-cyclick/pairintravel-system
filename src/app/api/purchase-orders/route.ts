import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const MAX_PASSENGERS_PER_BOOKING = 9

const passengerSchema = z.object({
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  nationalId: z.string().optional(),
  passportNo: z.string().optional(),
  dateOfBirth: z.string(),
  nationality: z.string(),
})

const bookingSchema = z.object({
  flightNumber: z.string(),
  airline: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  arrivalDate: z.string(),
  basePrice: z.number(),
  totalCost: z.number(),
  totalServiceFee: z.number(),
  passengers: z.array(passengerSchema),
})

const tourInfoSchema = z.object({
  tourId: z.string(),
  tourName: z.string(),
  destination: z.string(),
  duration: z.number(),
  price: z.number(),
})

const createPurchaseOrderSchema = z.object({
  type: z.enum(["FLIGHT", "TOUR"]),
  departmentId: z.string().optional(),
  customerId: z.string().optional(),
  tourPackageName: z.string().optional(),
  // Payment information
  paymentCardId: z.string().optional(),
  paymentCards: z.array(z.object({
    cardId: z.string(),
    amount: z.number()
  })).optional(),
  // For flight bookings - multiple bookings
  bookings: z.array(bookingSchema).optional(),
  // For tour bookings
  tourInfo: tourInfoSchema.optional(),
  tourPassengers: z.array(passengerSchema).optional(),
})

// Generate PO number
function generatePONumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `PO-${year}-${month}-${random}`
}

// Split passengers into groups of maximum 9
function splitPassengerGroups<T>(passengers: T[]): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < passengers.length; i += MAX_PASSENGERS_PER_BOOKING) {
    groups.push(passengers.slice(i, i + MAX_PASSENGERS_PER_BOOKING))
  }
  return groups
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          user: true,
          department: true,
          customer: true,
          bookings: {
            include: {
              flight: true,
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
          },
          invoices: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.purchaseOrder.count({ where })
    ])

    return NextResponse.json({
      purchaseOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user exists in database
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      console.error("User not found in database:", session.user.id)
      // Try to find user by email as fallback
      if (session.user.email) {
        user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        
        if (!user) {
          return NextResponse.json({ 
            error: "Session expired. Please log out and log in again." 
          }, { status: 401 })
        }
      } else {
        return NextResponse.json({ 
          error: "Session expired. Please log out and log in again." 
        }, { status: 401 })
      }
    }

    console.log("Session user:", session.user)
    console.log("User from DB:", user.email)

    const body = await request.json()
    const validatedData = createPurchaseOrderSchema.parse(body)

    const poNumber = generatePONumber()

    // Handle FLIGHT type PO
    if (validatedData.type === "FLIGHT") {
      if (!validatedData.bookings || validatedData.bookings.length === 0) {
        return NextResponse.json({ error: "At least one booking is required for flight purchase orders" }, { status: 400 })
      }

      // Calculate total amounts across all bookings
      let totalCost = 0
      let totalServiceFee = 0
      let totalAmount = 0

      validatedData.bookings.forEach(booking => {
        totalCost += booking.totalCost
        totalServiceFee += booking.totalServiceFee
        totalAmount += booking.basePrice * booking.passengers.length
      })

      const profit = totalAmount - totalCost - totalServiceFee

      // Create PO with transaction
      const purchaseOrder = await prisma.$transaction(async (tx) => {
        // Create PO first
        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            type: "FLIGHT",
            status: "CONFIRMED",
            departmentId: validatedData.departmentId,
            customerId: validatedData.customerId,
            totalAmount,
            cost: totalCost,
            serviceFee: totalServiceFee,
            profit,
            userId: user.id,
          }
        })

        // Handle credit card payment if provided
        if (validatedData.paymentCardId || validatedData.paymentCards) {
          // Single card payment
          if (validatedData.paymentCardId) {
            const card = await tx.creditCard.findUnique({
              where: { id: validatedData.paymentCardId }
            })

            if (!card || !card.isActive) {
              throw new Error("Credit card not found or inactive")
            }

            if (card.availableCredit < totalAmount) {
              throw new Error("Insufficient credit available")
            }

            // Create charge transaction with PO ID
            await tx.creditCardTransaction.create({
              data: {
                cardId: card.id,
                purchaseOrderId: po.id,
                transactionType: "CHARGE",
                amount: totalAmount,
                description: `Purchase Order ${poNumber}`,
                referenceNumber: poNumber,
                balanceBefore: card.availableCredit,
                balanceAfter: card.availableCredit - totalAmount,
                createdBy: user.id
              }
            })

            // Update card available credit
            await tx.creditCard.update({
              where: { id: card.id },
              data: { availableCredit: card.availableCredit - totalAmount }
            })
          }
          
          // Multiple cards payment
          else if (validatedData.paymentCards) {
            for (const payment of validatedData.paymentCards) {
              const card = await tx.creditCard.findUnique({
                where: { id: payment.cardId }
              })

              if (!card || !card.isActive) {
                throw new Error(`Credit card ${payment.cardId} not found or inactive`)
              }

              if (card.availableCredit < payment.amount) {
                throw new Error(`Insufficient credit on card ${card.cardNumber}`)
              }

              // Create charge transaction with PO ID
              await tx.creditCardTransaction.create({
                data: {
                  cardId: card.id,
                  purchaseOrderId: po.id,
                  transactionType: "CHARGE",
                  amount: payment.amount,
                  description: `Purchase Order ${poNumber} (Partial)`,
                  referenceNumber: poNumber,
                  balanceBefore: card.availableCredit,
                  balanceAfter: card.availableCredit - payment.amount,
                  createdBy: user.id
                }
              })

              // Update card available credit
              await tx.creditCard.update({
                where: { id: card.id },
                data: { availableCredit: card.availableCredit - payment.amount }
              })
            }
          }
        }

        // Process each booking
        for (const bookingData of validatedData.bookings) {
          // Split passengers if more than 9
          const passengerGroups = splitPassengerGroups(bookingData.passengers)
          
          for (let groupIndex = 0; groupIndex < passengerGroups.length; groupIndex++) {
            const group = passengerGroups[groupIndex]
            const bookingRef = `BK${Date.now()}${Math.random().toString(36).substr(2, 5)}`

            // Calculate proportional costs for this group
            const groupRatio = group.length / bookingData.passengers.length
            const groupCost = bookingData.totalCost * groupRatio
            const groupServiceFee = bookingData.totalServiceFee * groupRatio

            // Create or find customers for this group
            // Use a Map to track unique customers by email to avoid duplicates
            const customerMap = new Map<string, any>()
            
            for (const passenger of group) {
              if (!customerMap.has(passenger.email)) {
                const existingCustomer = await tx.customer.findFirst({
                  where: { email: passenger.email }
                })

                if (existingCustomer) {
                  const updatedCustomer = await tx.customer.update({
                    where: { id: existingCustomer.id },
                    data: {
                      title: passenger.title,
                      firstName: passenger.firstName,
                      lastName: passenger.lastName,
                      phone: passenger.phone,
                      nationalId: passenger.nationalId,
                      passportNo: passenger.passportNo,
                      dateOfBirth: new Date(passenger.dateOfBirth),
                      nationality: passenger.nationality
                    }
                  })
                  customerMap.set(passenger.email, updatedCustomer)
                } else {
                  const newCustomer = await tx.customer.create({
                    data: {
                      title: passenger.title,
                      firstName: passenger.firstName,
                      lastName: passenger.lastName,
                      email: passenger.email,
                      phone: passenger.phone,
                      nationalId: passenger.nationalId,
                      passportNo: passenger.passportNo,
                      dateOfBirth: new Date(passenger.dateOfBirth),
                      nationality: passenger.nationality
                    }
                  })
                  customerMap.set(passenger.email, newCustomer)
                }
              }
            }
            
            const uniqueCustomers = Array.from(customerMap.values())

            // Create booking for this group
            await tx.booking.create({
              data: {
                bookingRef,
                purchaseOrderId: po.id,
                type: group.length > 1 ? "GROUP" : "INDIVIDUAL",
                status: "CONFIRMED",
                flightNumber: bookingData.flightNumber,
                airline: bookingData.airline,
                origin: bookingData.origin,
                destination: bookingData.destination,
                departureDate: new Date(bookingData.departureDate),
                arrivalDate: new Date(bookingData.arrivalDate),
                basePrice: bookingData.basePrice,
                totalCost: groupCost,
                totalServiceFee: groupServiceFee,
                totalAmount: bookingData.basePrice * group.length,
                userId: user.id,
                departmentId: validatedData.departmentId,
                passengers: {
                  create: uniqueCustomers.map((customer) => ({
                    customerId: customer.id,
                    individualPrice: bookingData.basePrice,
                    individualCost: groupCost / uniqueCustomers.length,
                    individualServiceFee: groupServiceFee / uniqueCustomers.length,
                  }))
                }
              }
            })
          }
        }

        return po
      })

      // Fetch complete PO with relations
      const completePO = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrder.id },
        include: {
          user: true,
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
          }
        }
      })

      return NextResponse.json(completePO)
    }

    // Handle TOUR type PO
    if (validatedData.type === "TOUR") {
      if (!validatedData.tourInfo || !validatedData.tourPassengers) {
        return NextResponse.json({ error: "Tour information and passengers are required for tour bookings" }, { status: 400 })
      }

      const passengerGroups = splitPassengerGroups(validatedData.tourPassengers)

      // Create or find tour package
      let tourPackage = await prisma.tourPackage.findUnique({
        where: { tourId: validatedData.tourInfo.tourId }
      })

      if (!tourPackage) {
        tourPackage = await prisma.tourPackage.create({
          data: {
            tourId: validatedData.tourInfo.tourId,
            name: validatedData.tourInfo.tourName,
            description: "",
            destination: validatedData.tourInfo.destination,
            duration: validatedData.tourInfo.duration,
            price: validatedData.tourInfo.price,
            maxCapacity: 50,
            includes: [],
            isActive: true
          }
        })
      }

      // Calculate totals
      const totalPassengers = validatedData.tourPassengers.length
      const totalAmount = validatedData.tourInfo.price * totalPassengers
      // For tour bookings, we'll use default values for cost and service fee
      const totalCost = totalAmount * 0.8  // 80% of total amount as cost
      const totalServiceFee = totalAmount * 0.1  // 10% as service fee
      const profit = totalAmount - totalCost - totalServiceFee

      // Create PO with transaction
      const purchaseOrder = await prisma.$transaction(async (tx) => {
        // Create PO
        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            type: "TOUR",
            status: "CONFIRMED",
            departmentId: validatedData.departmentId,
            customerId: validatedData.customerId,
            totalAmount,
            cost: totalCost,
            serviceFee: totalServiceFee,
            profit,
            userId: user.id,
          }
        })

        // Create tour bookings for each passenger group
        for (let groupIndex = 0; groupIndex < passengerGroups.length; groupIndex++) {
          const group = passengerGroups[groupIndex]
          const bookingRef = `TB${Date.now()}${groupIndex}`

          // Create or find customers for this group
          const customers = await Promise.all(
            group.map(async (passenger) => {
              const existingCustomer = await tx.customer.findFirst({
                where: { email: passenger.email }
              })

              if (existingCustomer) {
                return tx.customer.update({
                  where: { id: existingCustomer.id },
                  data: {
                    title: passenger.title,
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    phone: passenger.phone,
                    nationalId: passenger.nationalId,
                    passportNo: passenger.passportNo,
                    dateOfBirth: new Date(passenger.dateOfBirth),
                    nationality: passenger.nationality
                  }
                })
              }

              return tx.customer.create({
                data: {
                  title: passenger.title,
                  firstName: passenger.firstName,
                  lastName: passenger.lastName,
                  email: passenger.email,
                  phone: passenger.phone,
                  nationalId: passenger.nationalId,
                  passportNo: passenger.passportNo,
                  dateOfBirth: new Date(passenger.dateOfBirth),
                  nationality: passenger.nationality
                }
              })
            })
          )

          // Create tour booking for this group
          await tx.tourBooking.create({
            data: {
              bookingRef,
              purchaseOrderId: po.id,
              tourPackageId: tourPackage.id,
              totalAmount: validatedData.tourInfo.price * group.length,
              status: "CONFIRMED",
              passengers: {
                create: customers.map((customer, index) => ({
                  customerId: customer.id,
                  specialRequests: "",
                  // Store cost/service fee if needed for tour passengers
                }))
              }
            }
          })
        }

        return po
      })

      // Fetch complete PO with relations
      const completePO = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrder.id },
        include: {
          user: true,
          department: true,
          customer: true,
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
      })

      return NextResponse.json(completePO)
    }

    return NextResponse.json({ error: "Invalid PO type" }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}