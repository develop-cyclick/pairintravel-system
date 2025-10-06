/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script migrates existing data to the multi-tenant schema by:
 * 1. Creating a default organization
 * 2. Updating all existing records to reference the default organization
 *
 * Usage: node migrate-to-multi-tenant.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_ORG = {
  code: 'DEFAULT',
  name: 'Default Organization',
  nameTh: 'องค์กรเริ่มต้น',
  address: 'Bangkok, Thailand',
  phone: '02-XXX-XXXX',
  email: 'admin@ptsystem.com',
  taxId: '0105561213350',
  isActive: true
}

async function migrate() {
  console.log('🚀 Starting migration to multi-tenant schema...\n')

  try {
    // Step 1: Create default organization
    console.log('📦 Step 1: Creating default organization...')

    const org = await prisma.organization.upsert({
      where: { code: DEFAULT_ORG.code },
      update: {},
      create: DEFAULT_ORG
    })

    console.log(`✅ Default organization created: ${org.name} (ID: ${org.id})\n`)

    // Step 2: Count existing records
    console.log('📊 Step 2: Counting existing records...')
    const counts = {
      users: await prisma.user.count(),
      customers: await prisma.customer.count(),
      departments: await prisma.department.count(),
      creditCards: await prisma.creditCard.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      bookings: await prisma.booking.count(),
      invoices: await prisma.invoice.count(),
      companySettings: await prisma.companySettings.count(),
      validationReports: await prisma.validationReport.count(),
      tourBookings: await prisma.tourBooking.count()
    }

    console.log('Current record counts:')
    Object.entries(counts).forEach(([model, count]) => {
      console.log(`  - ${model}: ${count}`)
    })
    console.log()

    // Step 3: Migrate data
    console.log('🔄 Step 3: Migrating records to default organization...')

    // Update Users
    if (counts.users > 0) {
      const userUpdate = await prisma.user.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ Users: ${userUpdate.count} records updated`)
    }

    // Update Customers
    if (counts.customers > 0) {
      const customerUpdate = await prisma.customer.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ Customers: ${customerUpdate.count} records updated`)
    }

    // Update Departments
    if (counts.departments > 0) {
      const deptUpdate = await prisma.department.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ Departments: ${deptUpdate.count} records updated`)
    }

    // Update CreditCards
    if (counts.creditCards > 0) {
      const cardUpdate = await prisma.creditCard.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ CreditCards: ${cardUpdate.count} records updated`)
    }

    // Update PurchaseOrders
    if (counts.purchaseOrders > 0) {
      const poUpdate = await prisma.purchaseOrder.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ PurchaseOrders: ${poUpdate.count} records updated`)
    }

    // Update Bookings
    if (counts.bookings > 0) {
      const bookingUpdate = await prisma.booking.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ Bookings: ${bookingUpdate.count} records updated`)
    }

    // Update Invoices
    if (counts.invoices > 0) {
      const invoiceUpdate = await prisma.invoice.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ Invoices: ${invoiceUpdate.count} records updated`)
    }

    // Update CompanySettings
    if (counts.companySettings > 0) {
      const settingsUpdate = await prisma.companySettings.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ CompanySettings: ${settingsUpdate.count} records updated`)
    }

    // Update ValidationReports
    if (counts.validationReports > 0) {
      const reportUpdate = await prisma.validationReport.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ ValidationReports: ${reportUpdate.count} records updated`)
    }

    // Update TourBookings
    if (counts.tourBookings > 0) {
      const tourUpdate = await prisma.tourBooking.updateMany({
        data: { organizationId: org.id }
      })
      console.log(`  ✅ TourBookings: ${tourUpdate.count} records updated`)
    }

    console.log('\n✨ Migration completed successfully!')
    console.log(`\nAll records have been migrated to organization: ${org.name}`)
    console.log('\nNext steps:')
    console.log('1. Run: npx dotenv -e .env.local -- prisma db push')
    console.log('2. Run: npx prisma generate')
    console.log('3. Restart your development server')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
