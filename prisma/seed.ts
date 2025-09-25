import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.invoice.deleteMany()
  await prisma.bookingPassenger.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.department.deleteMany()
  await prisma.flight.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@flightbooking.gov.th',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  })

  const agentUser = await prisma.user.create({
    data: {
      email: 'agent@flightbooking.gov.th',
      password: hashedPassword,
      name: 'Agent User',
      role: 'AGENT'
    }
  })

  // Create departments
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        code: 'MOF',
        nameEn: 'Ministry of Finance',
        nameTh: 'กระทรวงการคลัง',
        ministry: 'Ministry of Finance',
        address: '5 Thanon Phaya Thai, Pathum Wan, Bangkok 10330',
        phone: '02-126-5800',
        email: 'webmaster@mof.go.th',
        contactPerson: 'Khun Somchai Jaidee',
        budget: 5000000,
        isActive: true
      }
    }),
    prisma.department.create({
      data: {
        code: 'MOFA',
        nameEn: 'Ministry of Foreign Affairs',
        nameTh: 'กระทรวงการต่างประเทศ',
        ministry: 'Ministry of Foreign Affairs',
        address: '443 Sri Ayudhya Road, Ratchathewi, Bangkok 10400',
        phone: '02-203-5000',
        email: 'contact@mfa.go.th',
        contactPerson: 'Khun Siriporn Tanaka',
        budget: 3000000,
        isActive: true
      }
    }),
    prisma.department.create({
      data: {
        code: 'MOE',
        nameEn: 'Ministry of Education',
        nameTh: 'กระทรวงศึกษาธิการ',
        ministry: 'Ministry of Education',
        address: '319 Wang Chankasem, Dusit, Bangkok 10300',
        phone: '02-628-5600',
        email: 'info@moe.go.th',
        contactPerson: 'Khun Prasert Suksamran',
        budget: 8000000,
        isActive: true
      }
    }),
    prisma.department.create({
      data: {
        code: 'MOPH',
        nameEn: 'Ministry of Public Health',
        nameTh: 'กระทรวงสาธารณสุข',
        ministry: 'Ministry of Public Health',
        address: '88/22 Tiwanon Road, Nonthaburi 11000',
        phone: '02-590-1000',
        email: 'info@moph.go.th',
        contactPerson: 'Dr. Apinya Leelawat',
        budget: 10000000,
        isActive: true
      }
    }),
    prisma.department.create({
      data: {
        code: 'MOT',
        nameEn: 'Ministry of Transport',
        nameTh: 'กระทรวงคมนาคม',
        ministry: 'Ministry of Transport',
        address: '38 Ratchadamnoen Nok Ave, Bangkok 10100',
        phone: '02-283-3000',
        email: 'info@mot.go.th',
        contactPerson: 'Khun Wichit Sirichana',
        budget: 15000000,
        isActive: true
      }
    })
  ])

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        title: 'Mr',
        firstName: 'Somchai',
        lastName: 'Jaidee',
        email: 'somchai@example.com',
        phone: '0812345678',
        nationalId: '1234567890123',
        dateOfBirth: new Date('1980-01-15'),
        nationality: 'Thai'
      }
    }),
    prisma.customer.create({
      data: {
        title: 'Ms',
        firstName: 'Siriporn',
        lastName: 'Tanaka',
        email: 'siriporn@example.com',
        phone: '0823456789',
        nationalId: '2345678901234',
        dateOfBirth: new Date('1985-05-20'),
        nationality: 'Thai'
      }
    }),
    prisma.customer.create({
      data: {
        title: 'Mr',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        phone: '0834567890',
        passportNo: 'AB123456',
        dateOfBirth: new Date('1975-10-10'),
        nationality: 'American'
      }
    })
  ])

  // Create flights
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const flights = await Promise.all([
    prisma.flight.create({
      data: {
        flightNumber: 'TG110',
        airline: 'Thai Airways',
        origin: 'Bangkok (BKK)',
        destination: 'Chiang Mai (CNX)',
        departureTime: new Date(tomorrow.setHours(8, 0, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(9, 20, 0, 0)),
        price: 2500,
        availableSeats: 120,
        totalSeats: 150,
        status: 'SCHEDULED'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: 'TG202',
        airline: 'Thai Airways',
        origin: 'Bangkok (BKK)',
        destination: 'Phuket (HKT)',
        departureTime: new Date(tomorrow.setHours(10, 30, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(11, 50, 0, 0)),
        price: 3200,
        availableSeats: 80,
        totalSeats: 150,
        status: 'SCHEDULED'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: 'FD3001',
        airline: 'Thai AirAsia',
        origin: 'Bangkok (DMK)',
        destination: 'Hat Yai (HDY)',
        departureTime: new Date(tomorrow.setHours(14, 15, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(15, 45, 0, 0)),
        price: 1800,
        availableSeats: 150,
        totalSeats: 180,
        status: 'SCHEDULED'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: 'PG215',
        airline: 'Bangkok Airways',
        origin: 'Bangkok (BKK)',
        destination: 'Samui (USM)',
        departureTime: new Date(tomorrow.setHours(7, 0, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(8, 10, 0, 0)),
        price: 4500,
        availableSeats: 50,
        totalSeats: 70,
        status: 'SCHEDULED'
      }
    })
  ])

  // Create bookings
  const booking1 = await prisma.booking.create({
    data: {
      bookingRef: 'BK' + Date.now().toString().slice(-8),
      type: 'INDIVIDUAL',
      status: 'CONFIRMED',
      totalAmount: 2500,
      userId: agentUser.id,
      flightId: flights[0].id,
      departmentId: departments[0].id,
      purpose: 'Annual budget meeting in Chiang Mai',
      approvalRef: 'MOF-2024-001',
      passengers: {
        create: {
          customerId: customers[0].id,
          seatNumber: '12A'
        }
      }
    }
  })

  const booking2 = await prisma.booking.create({
    data: {
      bookingRef: 'BK' + (Date.now() + 1).toString().slice(-8),
      type: 'GROUP',
      status: 'CONFIRMED',
      totalAmount: 6400,
      userId: agentUser.id,
      flightId: flights[1].id,
      departmentId: departments[1].id,
      purpose: 'International conference preparation in Phuket',
      approvalRef: 'MOFA-2024-015',
      passengers: {
        create: [
          {
            customerId: customers[0].id,
            seatNumber: '15A'
          },
          {
            customerId: customers[1].id,
            seatNumber: '15B'
          }
        ]
      }
    }
  })
  
  const booking3 = await prisma.booking.create({
    data: {
      bookingRef: 'BK' + (Date.now() + 2).toString().slice(-8),
      type: 'INDIVIDUAL',
      status: 'PENDING',
      totalAmount: 4500,
      userId: agentUser.id,
      flightId: flights[3].id,
      passengers: {
        create: {
          customerId: customers[2].id,
          seatNumber: '8C'
        }
      }
    }
  })

  // Create invoices
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV' + Date.now().toString().slice(-8),
      bookingId: booking1.id,
      amount: 2500,
      tax: 175,
      totalAmount: 2675,
      status: 'PAID',
      userId: agentUser.id,
      paidAt: new Date()
    }
  })

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV' + (Date.now() + 1).toString().slice(-8),
      bookingId: booking2.id,
      amount: 6400,
      tax: 448,
      totalAmount: 6848,
      status: 'PENDING',
      userId: agentUser.id
    }
  })

  console.log('Seed data created successfully!')
  console.log('Login credentials:')
  console.log('Admin: admin@flightbooking.gov.th / password123')
  console.log('Agent: agent@flightbooking.gov.th / password123')
  console.log('')
  console.log('Sample Departments:')
  console.log('- MOF: Ministry of Finance')
  console.log('- MOFA: Ministry of Foreign Affairs')
  console.log('- MOE: Ministry of Education')
  console.log('- MOPH: Ministry of Public Health')
  console.log('- MOT: Ministry of Transport')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })