-- Migration Script: Single-Tenant to Multi-Tenant
-- This SQL script migrates existing data to the multi-tenant schema
--
-- Usage:
-- 1. Run this script first: psql $DATABASE_URL < migrate-to-multi-tenant.sql
-- 2. Then run: npx dotenv -e .env.local -- prisma db push
-- 3. Finally: npx prisma generate

BEGIN;

-- Step 1: Create Organization table
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

-- Create indexes for Organization
CREATE INDEX IF NOT EXISTS "Organization_code_idx" ON "Organization"("code");
CREATE INDEX IF NOT EXISTS "Organization_isActive_idx" ON "Organization"("isActive");

-- Step 2: Insert default organization
INSERT INTO "Organization" ("id", "code", "name", "nameTh", "address", "phone", "email", "taxId", "isActive", "createdAt", "updatedAt")
VALUES (
  'org_default_' || substr(md5(random()::text), 1, 20),
  'DEFAULT',
  'Default Organization',
  'องค์กรเริ่มต้น',
  'Bangkok, Thailand',
  '02-XXX-XXXX',
  'admin@ptsystem.com',
  '0105561213350',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

-- Get the organization ID
DO $$
DECLARE
  org_id TEXT;
BEGIN
  SELECT "id" INTO org_id FROM "Organization" WHERE "code" = 'DEFAULT';

  -- Step 3: Add organizationId columns as nullable first

  -- User
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='organizationId') THEN
    ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
    UPDATE "User" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
  END IF;

  -- Customer
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Customer' AND column_name='organizationId') THEN
    ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;
    UPDATE "Customer" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
  END IF;

  -- Department
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Department' AND column_name='organizationId') THEN
    ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT;
    UPDATE "Department" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "Department" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
  END IF;

  -- CreditCard
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CreditCard' AND column_name='organizationId') THEN
    ALTER TABLE "CreditCard" ADD COLUMN "organizationId" TEXT;
    UPDATE "CreditCard" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "CreditCard" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "CreditCard_organizationId_idx" ON "CreditCard"("organizationId");
  END IF;

  -- PurchaseOrder
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PurchaseOrder' AND column_name='organizationId') THEN
    ALTER TABLE "PurchaseOrder" ADD COLUMN "organizationId" TEXT;
    UPDATE "PurchaseOrder" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "PurchaseOrder" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "PurchaseOrder_organizationId_idx" ON "PurchaseOrder"("organizationId");
  END IF;

  -- Booking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='organizationId') THEN
    ALTER TABLE "Booking" ADD COLUMN "organizationId" TEXT;
    UPDATE "Booking" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "Booking" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "Booking_organizationId_idx" ON "Booking"("organizationId");
  END IF;

  -- Invoice
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Invoice' AND column_name='organizationId') THEN
    ALTER TABLE "Invoice" ADD COLUMN "organizationId" TEXT;
    UPDATE "Invoice" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");
  END IF;

  -- CompanySettings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CompanySettings' AND column_name='organizationId') THEN
    ALTER TABLE "CompanySettings" ADD COLUMN "organizationId" TEXT;
    UPDATE "CompanySettings" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
    ALTER TABLE "CompanySettings" ALTER COLUMN "organizationId" SET NOT NULL;
    CREATE UNIQUE INDEX "CompanySettings_organizationId_key" ON "CompanySettings"("organizationId");
    CREATE INDEX "CompanySettings_organizationId_idx" ON "CompanySettings"("organizationId");
  END IF;

  -- ValidationReport (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ValidationReport') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ValidationReport' AND column_name='organizationId') THEN
      ALTER TABLE "ValidationReport" ADD COLUMN "organizationId" TEXT;
      UPDATE "ValidationReport" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
      ALTER TABLE "ValidationReport" ALTER COLUMN "organizationId" SET NOT NULL;
      CREATE INDEX "ValidationReport_organizationId_idx" ON "ValidationReport"("organizationId");
    END IF;
  END IF;

  -- TourBooking (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='TourBooking') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TourBooking' AND column_name='organizationId') THEN
      ALTER TABLE "TourBooking" ADD COLUMN "organizationId" TEXT;
      UPDATE "TourBooking" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
      ALTER TABLE "TourBooking" ALTER COLUMN "organizationId" SET NOT NULL;
      CREATE INDEX "TourBooking_organizationId_idx" ON "TourBooking"("organizationId");
    END IF;
  END IF;

  -- Step 4: Add foreign key constraints
  ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ValidationReport') THEN
    ALTER TABLE "ValidationReport" ADD CONSTRAINT "ValidationReport_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='TourBooking') THEN
    ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

END $$;

COMMIT;

-- Migration completed successfully!
-- Next steps:
-- 1. Run: npx dotenv -e .env.local -- prisma db push
-- 2. Run: npx prisma generate
-- 3. Restart your development server
