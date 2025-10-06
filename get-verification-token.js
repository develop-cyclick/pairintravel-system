const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getVerificationToken() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        paymentVerifications: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${invoices.length} pending invoices\n`);

    for (const invoice of invoices) {
      console.log('---');
      console.log('Invoice:', invoice.invoiceNumber);
      console.log('Total Amount:', invoice.totalAmount);
      console.log('Created:', invoice.createdAt);

      if (invoice.paymentVerifications.length > 0) {
        const verification = invoice.paymentVerifications[0];
        console.log('Payment Verification:');
        console.log('  Token:', verification.verificationToken);
        console.log('  Status:', verification.status);
        console.log('  Expires At:', verification.expiresAt);
        console.log('  Verification URL:');
        console.log(`  http://localhost:3001/payment-verification/${verification.verificationToken}`);
      } else {
        console.log('No payment verification found');
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getVerificationToken();
