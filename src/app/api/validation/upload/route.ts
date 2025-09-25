import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadToR2 } from '@/lib/cloudflare'
import { ValidationService } from '@/lib/validation-service'
import { ValidationStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string
    const columnMapping = formData.get('columnMapping')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload CSV or Excel file.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique report number
    const reportNumber = `VAL-${Date.now().toString(36).toUpperCase()}`

    // Upload file to R2
    const fileKey = `validation-reports/${reportNumber}/${file.name}`
    const fileUrl = await uploadToR2(buffer, fileKey, file.type)

    // Create validation report record
    const report = await prisma.validationReport.create({
      data: {
        reportNumber,
        fileName: file.name,
        fileUrl,
        fileType: isCSV ? 'CSV' : 'EXCEL',
        totalRecords: 0,
        matchedRecords: 0,
        unmatchedRecords: 0,
        partialMatches: 0,
        status: ValidationStatus.PROCESSING,
        uploadedBy: session.user.id
      }
    })

    // Process file asynchronously
    const validationService = new ValidationService(report.id, session.user.id)
    const processingOptions = columnMapping
      ? { columnMapping: JSON.parse(columnMapping as string) }
      : undefined

    // Start processing in background
    validationService
      .processFile(buffer, report.fileType as 'CSV' | 'EXCEL', processingOptions)
      .catch(async (error) => {
        console.error('Validation processing error:', error)
        await prisma.validationReport.update({
          where: { id: report.id },
          data: {
            status: ValidationStatus.FAILED
          }
        })
      })

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
        status: report.status,
        message: 'File uploaded successfully. Processing started.'
      }
    })
  } catch (error) {
    console.error('Validation upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload and process file' },
      { status: 500 }
    )
  }
}