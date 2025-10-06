'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const paymentFormSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paymentAmount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentReference: z.string().optional(),
  paymentNotes: z.string().optional(),
  passengerName: z.string().min(1, 'Name is required'),
  passengerEmail: z.string().email('Invalid email address'),
  passengerPhone: z.string().min(1, 'Phone number is required')
})

interface FileUpload {
  file: File
  url?: string
  metadata?: {
    fileName: string
    fileSize: number
    fileType: string
    uploadedAt: string
  }
  uploading?: boolean
  error?: string
}

type PaymentFormData = z.infer<typeof paymentFormSchema>

interface VerificationData {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  expiresAt: string
  bookingRef: string
  passengers: Array<{
    name: string
    email: string
  }>
  purchaseOrder?: {
    poNumber: string
    department?: string
    customer?: string
  }
  paymentMethod?: string
  paymentAmount?: number
  paymentDate?: string
  paymentReference?: string
  paymentNotes?: string
  passengerName?: string
  passengerEmail?: string
  passengerPhone?: string
}

export default function PaymentVerificationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema)
  })

  const watchPaymentMethod = watch('paymentMethod')

  useEffect(() => {
    async function fetchVerificationData() {
      try {
        const response = await fetch(`/api/payment-verification/${token}`)

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load payment verification')
          return
        }

        const data = await response.json()
        setVerificationData(data)

        // Pre-fill form with existing data if available
        if (data.paymentMethod) setValue('paymentMethod', data.paymentMethod)
        if (data.paymentAmount) setValue('paymentAmount', data.paymentAmount)
        if (data.paymentDate) setValue('paymentDate', data.paymentDate.split('T')[0])
        if (data.paymentReference) setValue('paymentReference', data.paymentReference)
        if (data.paymentNotes) setValue('paymentNotes', data.paymentNotes)
        if (data.passengerName) setValue('passengerName', data.passengerName)
        if (data.passengerEmail) setValue('passengerEmail', data.passengerEmail)
        if (data.passengerPhone) setValue('passengerPhone', data.passengerPhone)

        // If no existing passenger info, try to pre-fill from booking data
        if (!data.passengerName && data.passengers.length > 0) {
          setValue('passengerName', data.passengers[0].name)
          setValue('passengerEmail', data.passengers[0].email)
        }

        // Set default payment amount to invoice amount
        if (!data.paymentAmount) {
          setValue('paymentAmount', data.amount)
        }

      } catch (err) {
        setError('Failed to load payment verification data')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchVerificationData()
    }
  }, [token, setValue])

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadError(null)

    // Check total files limit (max 5)
    if (uploadedFiles.length + files.length > 5) {
      setUploadError('Maximum 5 files allowed')
      return
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 10MB limit`)
        continue
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`File ${file.name} has invalid type. Only images and PDF allowed.`)
        continue
      }

      // Add file to uploading state
      const fileUpload: FileUpload = {
        file,
        uploading: true
      }
      setUploadedFiles(prev => [...prev, fileUpload])

      // Upload file
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('token', token)

        const response = await fetch('/api/payment-verification/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        const result = await response.json()

        // Update file with upload result
        setUploadedFiles(prev =>
          prev.map(f =>
            f.file === file
              ? { ...f, url: result.fileUrl, metadata: result.metadata, uploading: false }
              : f
          )
        )
      } catch (error: any) {
        // Update file with error
        setUploadedFiles(prev =>
          prev.map(f =>
            f.file === file
              ? { ...f, uploading: false, error: error.message }
              : f
          )
        )
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: PaymentFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      // Collect successfully uploaded file URLs and metadata
      const attachmentUrls = uploadedFiles
        .filter(f => f.url && !f.error)
        .map(f => f.url!)

      const attachmentMetadata = uploadedFiles
        .filter(f => f.metadata && !f.error)
        .map(f => f.metadata!)

      const response = await fetch('/api/payment-verification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          ...data,
          paymentDate: new Date(data.paymentDate).toISOString(),
          attachmentUrls,
          attachmentMetadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit payment information')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Failed to submit payment information')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'EXPIRED':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      default:
        return <Clock className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      'PENDING': 'secondary',
      'VERIFIED': 'default',
      'REJECTED': 'destructive',
      'EXPIRED': 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading payment verification...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Verification Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/')}
              className="w-full mt-4"
              variant="outline"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-700">Payment Information Submitted</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Your payment information has been submitted successfully.
              Our team will review and verify your payment within 1-2 business days.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              You will receive an email confirmation once your payment has been verified.
            </p>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Verification</h1>
          <p className="text-gray-600">Submit your payment information for verification</p>
        </div>

        {/* Invoice Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(verificationData!.status)}
                Invoice #{verificationData!.invoiceNumber}
              </CardTitle>
              {getStatusBadge(verificationData!.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Booking Reference</Label>
                <p className="font-mono">{verificationData!.bookingRef}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                <p className="text-lg font-semibold">฿{verificationData!.amount.toLocaleString()}</p>
              </div>
              {verificationData!.purchaseOrder && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">PO Number</Label>
                    <p className="font-mono">{verificationData!.purchaseOrder.poNumber}</p>
                  </div>
                  {verificationData!.purchaseOrder.department && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Department</Label>
                      <p>{verificationData!.purchaseOrder.department}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {verificationData!.passengers.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-2 block">Passengers</Label>
                  <div className="space-y-1">
                    {verificationData!.passengers.map((passenger, index) => (
                      <p key={index} className="text-sm">{passenger.name}</p>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4" />
            <div>
              <Label className="text-sm font-medium text-gray-500">Expires At</Label>
              <p className="text-sm text-red-600">
                {new Date(verificationData!.expiresAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>
              Please provide details about your payment to verify the transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={watchPaymentMethod}
                    onValueChange={(value) => setValue('paymentMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="PromptPay">PromptPay</SelectItem>
                      <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && (
                    <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentAmount">Payment Amount (฿) *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    {...register('paymentAmount', { valueAsNumber: true })}
                  />
                  {errors.paymentAmount && (
                    <p className="text-sm text-red-600">{errors.paymentAmount.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    {...register('paymentDate')}
                  />
                  {errors.paymentDate && (
                    <p className="text-sm text-red-600">{errors.paymentDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentReference">Payment Reference</Label>
                  <Input
                    id="paymentReference"
                    placeholder="Transaction ID, Reference number, etc."
                    {...register('paymentReference')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentNotes">Payment Notes</Label>
                <Textarea
                  id="paymentNotes"
                  placeholder="Additional notes about the payment..."
                  rows={3}
                  {...register('paymentNotes')}
                />
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Proof of Payment (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload payment receipt, transaction screenshot, or proof of payment (Max 5 files, 10MB each)
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG, WebP or PDF (max 10MB each)
                      </p>
                    </div>
                  </Label>
                </div>

                {uploadError && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((fileUpload, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {fileUpload.uploading ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            ) : fileUpload.error ? (
                              <XCircle className="h-8 w-8 text-red-500" />
                            ) : (
                              <CheckCircle className="h-8 w-8 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {fileUpload.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {fileUpload.error && (
                              <p className="text-xs text-red-600">{fileUpload.error}</p>
                            )}
                          </div>
                        </div>
                        {!fileUpload.uploading && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passengerName">Full Name *</Label>
                    <Input
                      id="passengerName"
                      placeholder="Your full name"
                      {...register('passengerName')}
                    />
                    {errors.passengerName && (
                      <p className="text-sm text-red-600">{errors.passengerName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="passengerEmail">Email Address *</Label>
                    <Input
                      id="passengerEmail"
                      type="email"
                      placeholder="your.email@example.com"
                      {...register('passengerEmail')}
                    />
                    {errors.passengerEmail && (
                      <p className="text-sm text-red-600">{errors.passengerEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="passengerPhone">Phone Number *</Label>
                  <Input
                    id="passengerPhone"
                    placeholder="Your phone number"
                    {...register('passengerPhone')}
                  />
                  {errors.passengerPhone && (
                    <p className="text-sm text-red-600">{errors.passengerPhone.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Payment Information'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}