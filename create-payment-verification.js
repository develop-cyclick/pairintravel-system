const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createPaymentVerification() {
  try {
    // Get the first pending invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: 'INV-2025-09-32266',
        status: 'PENDING'
      }
    });

    if (!invoice) {
      console.log('Invoice not found');
      return;
    }

    console.log('Creating payment verification for invoice:', invoice.invoiceNumber);
    console.log('Amount:', invoice.totalAmount);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Set expiration to 72 hours from now
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Create payment verification
    const verification = await prisma.paymentVerification.create({
      data: {
        invoiceId: invoice.id,
        verificationToken,
        expiresAt,
        status: 'PENDING'
      }
    });

    console.log('\nPayment verification created:');
    console.log('Token:', verification.verificationToken);
    console.log('Expires:', verification.expiresAt);
    console.log('\nVerification URL:');
    console.log(`http://localhost:3001/payment-verification/${verification.verificationToken}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPaymentVerification();
