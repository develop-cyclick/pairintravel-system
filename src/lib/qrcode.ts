import QRCode from 'qrcode'

export interface PaymentQRData {
  invoiceNumber: string
  amount: number
  bookingRef: string
  dueDate?: Date
}

export interface PaymentVerificationQRData {
  token: string
  invoiceNumber: string
  amount: number
  expiresAt: Date
}

export async function generatePaymentQR(data: PaymentQRData): Promise<string> {
  const paymentData = {
    type: "PAYMENT",
    invoice: data.invoiceNumber,
    amount: data.amount,
    ref: data.bookingRef,
    dueDate: data.dueDate?.toISOString() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    timestamp: new Date().toISOString()
  }
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(paymentData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function generatePromptPayQR(data: {
  mobileNumber: string
  amount: number
  reference?: string
}): Promise<string> {
  // PromptPay QR format for Thai payment system
  const promptPayData = {
    type: "PROMPTPAY",
    mobile: data.mobileNumber.replace(/[^0-9]/g, ''),
    amount: data.amount,
    reference: data.reference || '',
    currency: "THB"
  }
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(promptPayData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating PromptPay QR code:', error)
    throw new Error('Failed to generate PromptPay QR code')
  }
}

export async function generatePaymentVerificationQR(data: PaymentVerificationQRData): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/payment-verification/${data.token}`

  const qrData = {
    type: "PAYMENT_VERIFICATION",
    url: verificationUrl,
    token: data.token,
    invoiceNumber: data.invoiceNumber,
    amount: data.amount,
    expiresAt: data.expiresAt.toISOString(),
    instructions: "Scan to update payment status"
  }

  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating payment verification QR code:', error)
    throw new Error('Failed to generate payment verification QR code')
  }
}