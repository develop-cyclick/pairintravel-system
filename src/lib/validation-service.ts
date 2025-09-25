import * as XLSX from 'xlsx'
import { parse } from 'csv-parser'
import { Readable } from 'stream'
import { prisma } from '@/lib/db'
import { MatchStatus, ValidationStatus } from '@prisma/client'

interface AirlineRecord {
  pnr?: string
  bookingRef?: string
  ticketNumber?: string
  passengerName?: string
  firstName?: string
  lastName?: string
  flightNumber?: string
  flightDate?: string | Date
  amount?: number | string
  [key: string]: any
}

interface ValidationOptions {
  columnMapping?: {
    pnr?: string
    bookingRef?: string
    ticketNumber?: string
    passengerName?: string
    firstName?: string
    lastName?: string
    flightNumber?: string
    flightDate?: string
    amount?: string
  }
}

export class ValidationService {
  private reportId: string
  private userId: string

  constructor(reportId: string, userId: string) {
    this.reportId = reportId
    this.userId = userId
  }

  async processFile(
    fileBuffer: Buffer,
    fileType: 'CSV' | 'EXCEL',
    options?: ValidationOptions
  ) {
    try {
      // Parse the file based on type
      const records = fileType === 'CSV'
        ? await this.parseCSV(fileBuffer, options)
        : await this.parseExcel(fileBuffer, options)

      // Process each record
      const results = await Promise.all(
        records.map(record => this.validateRecord(record))
      )

      // Update report statistics
      const matchedCount = results.filter(r => r.matchStatus === 'MATCHED').length
      const unmatchedCount = results.filter(r => r.matchStatus === 'UNMATCHED').length
      const partialCount = results.filter(r => r.matchStatus === 'PARTIAL').length

      await prisma.validationReport.update({
        where: { id: this.reportId },
        data: {
          totalRecords: records.length,
          matchedRecords: matchedCount,
          unmatchedRecords: unmatchedCount,
          partialMatches: partialCount,
          status: ValidationStatus.COMPLETED
        }
      })

      return {
        success: true,
        totalRecords: records.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        partial: partialCount
      }
    } catch (error) {
      await prisma.validationReport.update({
        where: { id: this.reportId },
        data: {
          status: ValidationStatus.FAILED
        }
      })
      throw error
    }
  }

  private async parseCSV(
    fileBuffer: Buffer,
    options?: ValidationOptions
  ): Promise<AirlineRecord[]> {
    return new Promise((resolve, reject) => {
      const records: AirlineRecord[] = []
      const stream = Readable.from(fileBuffer.toString())

      stream
        .pipe(parse({ headers: true }))
        .on('data', (data) => {
          records.push(this.mapColumns(data, options?.columnMapping))
        })
        .on('end', () => resolve(records))
        .on('error', reject)
    })
  }

  private async parseExcel(
    fileBuffer: Buffer,
    options?: ValidationOptions
  ): Promise<AirlineRecord[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet)

    return rawData.map(row => this.mapColumns(row as any, options?.columnMapping))
  }

  private mapColumns(
    row: any,
    mapping?: ValidationOptions['columnMapping']
  ): AirlineRecord {
    if (!mapping) {
      return row
    }

    return {
      pnr: mapping.pnr ? row[mapping.pnr] : row.pnr,
      bookingRef: mapping.bookingRef ? row[mapping.bookingRef] : row.bookingRef,
      ticketNumber: mapping.ticketNumber ? row[mapping.ticketNumber] : row.ticketNumber,
      passengerName: this.getPassengerName(row, mapping),
      flightNumber: mapping.flightNumber ? row[mapping.flightNumber] : row.flightNumber,
      flightDate: mapping.flightDate ? row[mapping.flightDate] : row.flightDate,
      amount: mapping.amount ? row[mapping.amount] : row.amount,
      ...row
    }
  }

  private getPassengerName(row: any, mapping?: ValidationOptions['columnMapping']): string {
    if (mapping?.passengerName && row[mapping.passengerName]) {
      return row[mapping.passengerName]
    }

    if (mapping?.firstName && mapping?.lastName) {
      const firstName = row[mapping.firstName] || ''
      const lastName = row[mapping.lastName] || ''
      return `${firstName} ${lastName}`.trim()
    }

    return row.passengerName || ''
  }

  private async validateRecord(record: AirlineRecord) {
    const airlineRef = record.pnr || record.bookingRef || ''
    const ticketNumber = record.ticketNumber || null
    const passengerName = record.passengerName || ''
    const flightNumber = record.flightNumber || ''
    const flightDate = this.parseDate(record.flightDate)
    const amount = this.parseAmount(record.amount)

    // Try to find matching booking
    const matchResult = await this.findMatchingBooking(
      airlineRef,
      ticketNumber,
      passengerName,
      flightNumber,
      flightDate
    )

    // Create validation result
    const result = await prisma.validationResult.create({
      data: {
        reportId: this.reportId,
        bookingId: matchResult.bookingId,
        airlineRef,
        ticketNumber,
        passengerName,
        flightNumber,
        flightDate: flightDate || new Date(),
        amount,
        matchStatus: matchResult.status,
        matchScore: matchResult.score,
        matchDetails: matchResult.details
      }
    })

    // If fully matched, update the booking
    if (matchResult.status === MatchStatus.MATCHED && matchResult.bookingId) {
      await prisma.booking.update({
        where: { id: matchResult.bookingId },
        data: {
          airlinePNR: airlineRef,
          ticketNumber: ticketNumber,
          isValidated: true,
          validatedAt: new Date(),
          validatedBy: this.userId
        }
      })
    }

    return result
  }

  private async findMatchingBooking(
    airlineRef: string,
    ticketNumber: string | null,
    passengerName: string,
    flightNumber: string,
    flightDate: Date | null
  ): Promise<{
    bookingId: string | null
    status: MatchStatus
    score: number
    details: any
  }> {
    // First try exact match by booking reference
    if (airlineRef) {
      const booking = await prisma.booking.findFirst({
        where: {
          OR: [
            { bookingRef: airlineRef },
            { airlinePNR: airlineRef }
          ]
        },
        include: {
          passengers: {
            include: {
              customer: true
            }
          }
        }
      })

      if (booking) {
        return {
          bookingId: booking.id,
          status: MatchStatus.MATCHED,
          score: 100,
          details: { matchType: 'exact_reference' }
        }
      }
    }

    // Try to match by flight and date
    if (flightNumber && flightDate) {
      const dateStart = new Date(flightDate)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(flightDate)
      dateEnd.setHours(23, 59, 59, 999)

      const bookings = await prisma.booking.findMany({
        where: {
          flightNumber: {
            contains: flightNumber,
            mode: 'insensitive'
          },
          departureDate: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        include: {
          passengers: {
            include: {
              customer: true
            }
          }
        }
      })

      // Check passenger names
      for (const booking of bookings) {
        const matchScore = this.calculateNameMatch(
          passengerName,
          booking.passengers.map(p =>
            `${p.customer.firstName} ${p.customer.lastName}`
          )
        )

        if (matchScore >= 80) {
          return {
            bookingId: booking.id,
            status: MatchStatus.MATCHED,
            score: matchScore,
            details: {
              matchType: 'flight_date_passenger',
              nameScore: matchScore
            }
          }
        } else if (matchScore >= 50) {
          return {
            bookingId: booking.id,
            status: MatchStatus.PARTIAL,
            score: matchScore,
            details: {
              matchType: 'partial_match',
              nameScore: matchScore
            }
          }
        }
      }
    }

    return {
      bookingId: null,
      status: MatchStatus.UNMATCHED,
      score: 0,
      details: { reason: 'no_match_found' }
    }
  }

  private calculateNameMatch(name1: string, names: string[]): number {
    const normalizedName1 = name1.toLowerCase().trim()
    let maxScore = 0

    for (const name2 of names) {
      const normalizedName2 = name2.toLowerCase().trim()

      // Exact match
      if (normalizedName1 === normalizedName2) {
        return 100
      }

      // Calculate similarity score
      const score = this.calculateSimilarity(normalizedName1, normalizedName2)
      maxScore = Math.max(maxScore, score)
    }

    return maxScore
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) {
      return 100
    }

    const editDistance = this.levenshteinDistance(longer, shorter)
    return ((longer.length - editDistance) / longer.length) * 100
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  private parseDate(value: any): Date | null {
    if (!value) return null

    if (value instanceof Date) {
      return value
    }

    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  private parseAmount(value: any): number {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }

    return 0
  }
}