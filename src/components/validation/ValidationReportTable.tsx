'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  FileText,
  Download
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface ValidationResult {
  id: string
  airlineRef: string
  ticketNumber: string | null
  passengerName: string
  flightNumber: string
  flightDate: Date
  amount: number
  matchStatus: string
  matchScore: number | null
  isApproved: boolean
  booking: {
    id: string
    bookingRef: string
    passengers: Array<{
      customer: {
        firstName: string
        lastName: string
      }
    }>
  } | null
}

interface ValidationReportTableProps {
  results: ValidationResult[]
  onResultUpdate: () => void
}

export function ValidationReportTable({ results, onResultUpdate }: ValidationReportTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAction = async (resultId: string, action: 'approve' | 'reject', bookingId?: string) => {
    setProcessingId(resultId)

    try {
      const response = await fetch(`/api/validation/reports/${resultId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId,
          action,
          bookingId
        })
      })

      if (response.ok) {
        toast({
          title: `Result ${action === 'approve' ? 'approved' : 'rejected'}`,
          description: 'Validation result has been updated'
        })
        onResultUpdate()
      } else {
        const error = await response.json()
        toast({
          title: 'Update failed',
          description: error.error || 'Failed to update result',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating result:', error)
      toast({
        title: 'Error',
        description: 'Failed to update validation result',
        variant: 'destructive'
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'MATCHED':
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'UNMATCHED':
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'PARTIAL':
      case 'DUPLICATE':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string, score: number | null) => {
    const variant =
      status === 'MATCHED' || status === 'APPROVED' ? 'default' :
      status === 'UNMATCHED' || status === 'REJECTED' ? 'destructive' :
      'secondary'

    return (
      <div className="flex items-center gap-2">
        <Badge variant={variant}>
          {status}
        </Badge>
        {score !== null && (
          <span className="text-xs text-muted-foreground">
            {score.toFixed(0)}%
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Airline Ref</TableHead>
            <TableHead>Ticket #</TableHead>
            <TableHead>Passenger</TableHead>
            <TableHead>Flight</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>System Match</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell>
                {getStatusIcon(result.matchStatus)}
              </TableCell>
              <TableCell className="font-medium">
                {result.airlineRef}
              </TableCell>
              <TableCell>
                {result.ticketNumber || '-'}
              </TableCell>
              <TableCell>
                {result.passengerName}
              </TableCell>
              <TableCell>
                {result.flightNumber}
              </TableCell>
              <TableCell>
                {format(new Date(result.flightDate), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell>
                ฿{result.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                {getStatusBadge(result.matchStatus, result.matchScore)}
              </TableCell>
              <TableCell>
                {result.booking ? (
                  <div>
                    <p className="text-sm font-medium">{result.booking.bookingRef}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.booking.passengers.map(p =>
                        `${p.customer.firstName} ${p.customer.lastName}`
                      ).join(', ')}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No match</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={processingId === result.id}
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {result.matchStatus === 'MATCHED' && !result.isApproved && (
                      <DropdownMenuItem
                        onClick={() => handleAction(result.id, 'approve', result.booking?.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Match
                      </DropdownMenuItem>
                    )}
                    {result.matchStatus === 'PARTIAL' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleAction(result.id, 'approve', result.booking?.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve as Match
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAction(result.id, 'reject')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Match
                        </DropdownMenuItem>
                      </>
                    )}
                    {result.matchStatus === 'UNMATCHED' && (
                      <DropdownMenuItem disabled>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Manual Link Required
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {results.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                No validation results found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}