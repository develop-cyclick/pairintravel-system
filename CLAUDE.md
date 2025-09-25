# Flight Booking System - Implementation Guide

## Project Overview

A comprehensive flight booking system for Thai government agencies with features for individual/group bookings, rescheduling, invoice generation with QR codes, and reporting.

## Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **UI Components**: Shadcn UI
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Storage**: Cloudflare R2
- **QR Generation**: qrcode
- **PDF Generation**: jspdf
- **Charts**: Recharts

## Implementation Steps

### Step 1: Core Dependencies Installation

```bash
# Database & ORM
npm install @prisma/client prisma

# Authentication
npm install next-auth @auth/prisma-adapter bcryptjs
npm install --save-dev @types/bcryptjs

# Cloudflare Storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# QR Code & PDF
npm install qrcode jspdf html2canvas
npm install --save-dev @types/qrcode

# Form Validation
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install date-fns uuid recharts
npm install --save-dev @types/uuid

# Development
npm install --save-dev @types/node
```

### Step 2: Shadcn UI Setup

```bash
# Initialize Shadcn UI
npx shadcn@latest init

# Install required components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add calendar
npx shadcn@latest add toast
npx shadcn@latest add badge
npx shadcn@latest add chart
npx shadcn@latest add navigation-menu
npx shadcn@latest add sheet
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add alert
```

### Step 3: Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@neon.tech/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_ACCESS_KEY_ID="your-access-key"
CLOUDFLARE_SECRET_ACCESS_KEY="your-secret-key"
CLOUDFLARE_R2_BUCKET="flight-booking-docs"
CLOUDFLARE_R2_PUBLIC_URL="https://your-r2-url.com"
```

### Step 4: Database Schema

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(AGENT)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  bookings      Booking[]
  invoices      Invoice[]
}

model Customer {
  id            String    @id @default(cuid())
  title         String
  firstName     String
  lastName      String
  email         String    @unique
  phone         String
  passportNo    String?
  nationalId    String?
  dateOfBirth   DateTime
  nationality   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  bookings      BookingPassenger[]
}

model Flight {
  id            String    @id @default(cuid())
  flightNumber  String    @unique
  airline       String
  origin        String
  destination   String
  departureTime DateTime
  arrivalTime   DateTime
  price         Float
  availableSeats Int
  totalSeats    Int
  status        FlightStatus @default(SCHEDULED)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  bookings      Booking[]
}

model Booking {
  id            String    @id @default(cuid())
  bookingRef    String    @unique
  type          BookingType
  status        BookingStatus @default(PENDING)
  totalAmount   Float
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  flightId      String
  flight        Flight    @relation(fields: [flightId], references: [id])
  passengers    BookingPassenger[]
  invoice       Invoice?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([bookingRef])
  @@index([userId])
  @@index([flightId])
}

model BookingPassenger {
  id          String    @id @default(cuid())
  bookingId   String
  booking     Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  customerId  String
  customer    Customer  @relation(fields: [customerId], references: [id])
  seatNumber  String?

  @@unique([bookingId, customerId])
}

model Invoice {
  id            String    @id @default(cuid())
  invoiceNumber String    @unique
  bookingId     String    @unique
  booking       Booking   @relation(fields: [bookingId], references: [id])
  amount        Float
  tax           Float
  totalAmount   Float
  status        InvoiceStatus @default(PENDING)
  qrCode        String?
  pdfUrl        String?
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  paidAt        DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([invoiceNumber])
}

enum Role {
  ADMIN
  AGENT
  VIEWER
}

enum BookingType {
  INDIVIDUAL
  GROUP
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  RESCHEDULED
}

enum FlightStatus {
  SCHEDULED
  DELAYED
  CANCELLED
  COMPLETED
}

enum InvoiceStatus {
  PENDING
  PAID
  CANCELLED
  REFUNDED
}
```

### Step 5: API Routes Structure

```
src/app/api/
├── auth/
│   ├── [...nextauth]/route.ts
│   └── register/route.ts
├── bookings/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT, DELETE)
│   └── [id]/reschedule/route.ts
├── customers/
│   ├── route.ts (GET, POST)
│   └── [id]/route.ts (GET, PUT)
├── flights/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT)
│   └── search/route.ts
├── invoices/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET)
│   ├── [id]/pdf/route.ts
│   └── [id]/confirm-payment/route.ts
└── reports/
    ├── daily/route.ts
    ├── weekly/route.ts
    └── monthly/route.ts
```

### Step 6: Key Features Implementation

#### Authentication Setup

```typescript
// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Authentication logic
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
};
```

#### QR Code Generation

```typescript
// lib/qrcode.ts
import QRCode from "qrcode";

export async function generatePaymentQR(invoiceData: {
  invoiceNumber: string;
  amount: number;
  bookingRef: string;
}): Promise<string> {
  const paymentData = {
    type: "PAYMENT",
    invoice: invoiceData.invoiceNumber,
    amount: invoiceData.amount,
    ref: invoiceData.bookingRef,
    timestamp: new Date().toISOString(),
  };

  return await QRCode.toDataURL(JSON.stringify(paymentData));
}
```

#### Cloudflare R2 Integration

```typescript
// lib/cloudflare.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(file: Buffer, key: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
    Key: key,
    Body: file,
  });

  await s3Client.send(command);
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}
```

### Step 7: Testing Commands

```bash
# Run development server
npm run dev

# Lint code
npm run lint

# Build for production
npm run build

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database
npx prisma db seed
```

### Step 8: Deployment Checklist

- [ ] Set up Neon PostgreSQL database
- [ ] Configure Cloudflare R2 bucket
- [ ] Set environment variables in production
- [ ] Run database migrations
- [ ] Configure NextAuth for production
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test all features in staging

## Features Documentation

### 1. Booking System

- Individual bookings: Single passenger
- Group bookings: 2-50 passengers
- Real-time seat availability
- Automatic booking reference generation

### 2. Rescheduling

- Change flight date/time
- Calculate fare differences
- Update booking status
- Send confirmation emails

### 3. Invoice Generation

- Thai government format compliance
- QR code for payment verification
- PDF generation and storage
- Payment tracking

### 4. Reporting

- Daily: New bookings, revenue, cancellations
- Weekly: 7-day trends, popular routes
- Monthly: Performance metrics, agent reports
- Export to PDF/Excel

## Security Considerations

- JWT token authentication
- Role-based access control
- Input validation with Zod
- SQL injection prevention with Prisma
- XSS protection
- CSRF protection
- Rate limiting on API routes

## Performance Optimizations

- Database indexing on frequently queried fields
- Pagination for large datasets
- Caching with Redis (optional)
- Image optimization with Next.js Image
- Lazy loading components
- Code splitting

## Maintenance

- Regular database backups
- Log monitoring
- Performance monitoring
- Security updates
- Database optimization
- Storage cleanup

## Support

For issues or questions, contact the development team.

## Login Credentials:

- Admin: admin@flightbooking.gov.th / password123
- Agent: agent@flightbooking.gov.th / password123
