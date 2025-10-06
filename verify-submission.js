const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySubmission() {
  try {
    const verification = await prisma.paymentVerification.findUnique({
      where: {
        verificationToken: '150c911c45e75fdb268eb4aeca0db02cbda693fbcc69cc3f117b9b7dc3d1aaac'
      },
      include: {
        invoice: true
      }
    });

    if (!verification) {
      console.log('Verification not found');
      return;
    }

    console.log('=== Payment Verification Details ===\n');
    console.log('Status:', verification.status);
    console.log('Payment Method:', verification.paymentMethod);
    console.log('Payment Amount:', verification.paymentAmount);
    console.log('Payment Date:', verification.paymentDate);
    console.log('Payment Reference:', verification.paymentReference);
    console.log('Payment Notes:', verification.paymentNotes);
    console.log('\n=== Passenger Information ===');
    console.log('Name:', verification.passengerName);
    console.log('Email:', verification.passengerEmail);
    console.log('Phone:', verification.passengerPhone);
    console.log('\n=== Submission Details ===');
    console.log('IP Address:', verification.ipAddress);
    console.log('User Agent:', verification.userAgent?.substring(0, 50) + '...');
    console.log('Submitted At:', verification.submittedAt);
    console.log('\n=== Attachments ===');
    console.log('Number of files:', verification.attachmentUrls?.length || 0);
    if (verification.attachmentUrls && verification.attachmentUrls.length > 0) {
      verification.attachmentUrls.forEach((url, i) => {
        console.log(`File ${i + 1}:`, url);
      });
    }
    console.log('\n=== Invoice Details ===');
    console.log('Invoice Number:', verification.invoice.invoiceNumber);
    console.log('Total Amount:', verification.invoice.totalAmount);
    console.log('Invoice Status:', verification.invoice.status);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySubmission();
