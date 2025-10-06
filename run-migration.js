/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script uses raw SQL to migrate the database to multi-tenant schema
 * Usage: node run-migration.js
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrate() {
  console.log('🚀 Starting migration to multi-tenant schema...\n')

  try {
    // Step 1: Create Organization table
    console.log('📦 Step 1: Creating Organization table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Organization" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "nameTh" TEXT,
        "address" TEXT,
        "phone" TEXT,
        "email" TEXT,
        "taxId" TEXT,
        "logo" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Organization_code_idx" ON "Organization"("code");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Organization_isActive_idx" ON "Organization"("isActive");`)
    console.log('✅ Organization table created\n')

    // Step 2: Insert default organization
    console.log('📦 Step 2: Creating default organization...')
    const orgId = 'org_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Organization" ("id", "code", "name", "nameTh", "address", "phone", "email", "taxId", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("code") DO NOTHING;
    `, orgId, 'DEFAULT', 'Default Organization', 'องค์กรเริ่มต้น', 'Bangkok, Thailand', '02-XXX-XXXX', 'admin@ptsystem.com', '0105561213350', true)

    // Get the actual org ID (in case it existed)
    const orgResult = await prisma.$queryRawUnsafe(`SELECT "id" FROM "Organization" WHERE "code" = 'DEFAULT' LIMIT 1;`)
    const defaultOrgId = orgResult[0].id
    console.log(`✅ Default organization ID: ${defaultOrgId}\n`)

    // Step 3: Add and populate organizationId columns
    console.log('🔄 Step 3: Adding organizationId columns and migrating data...\n')

    const tables = [
      'User',
      'Customer',
      'Department',
      'CreditCard',
      'PurchaseOrder',
      'Booking',
      'Invoice',
      'CompanySettings',
      'ValidationReport',
      'TourBooking'
    ]

    for (const table of tables) {
      try {
        // Check if table exists
        const tableExists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = $1
          );
        `, table)

        if (!tableExists[0].exists) {
          console.log(`  ⏭️  Skipping ${table} (table doesn't exist)`)
          continue
        }

        // Check if column already exists
        const columnExists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'organizationId'
          );
        `, table)

        if (columnExists[0].exists) {
          console.log(`  ⏭️  Skipping ${table} (organizationId already exists)`)
          continue
        }

        // Add column as nullable
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "organizationId" TEXT;`)

        // Update all records
        const updateResult = await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "organizationId" = $1 WHERE "organizationId" IS NULL;`, defaultOrgId)

        // Make column NOT NULL
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "organizationId" SET NOT NULL;`)

        // Add index
        await prisma.$executeRawUnsafe(`CREATE INDEX "${table}_organizationId_idx" ON "${table}"("organizationId");`)

        // Add unique constraint for CompanySettings
        if (table === 'CompanySettings') {
          await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "CompanySettings_organizationId_key" ON "CompanySettings"("organizationId");`)
        }

        // Add foreign key constraint
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${table}" ADD CONSTRAINT "${table}_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
        `)

        console.log(`  ✅ ${table}: organizationId column added and data migrated`)

      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`  ⏭️  Skipping ${table} (constraint already exists)`)
        } else {
          console.error(`  ❌ Error migrating ${table}:`, error.message)
        }
      }
    }

    console.log('\n✨ Migration completed successfully!')
    console.log(`\nAll records have been migrated to organization: Default Organization`)
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
