'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ValidationUploadDialog } from '@/components/validation/ValidationUploadDialog'
import { ValidationReportTable } from '@/components/validation/ValidationReportTable'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react'
import { format } from 'date-fns'

interface ValidationReport {
  id: string
  reportNumber: string
  fileName: string
  fileType: string
  totalRecords: number
  matchedRecords: number
  unmatchedRecords: number
  partialMatches: number
  status: string
  user: {
    name: string
    email: string
  }
  createdAt: string
  _count: {
    results: number
  }
}

export default function ValidationDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<ValidationReport[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [statistics, setStatistics] = useState({
    totalBookings: 0,
    validatedBookings: 0,
    unvalidatedBookings: 0,
    validationRate: 0
  })

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    fetchReports()
    fetchStatistics()
  }, [session, router])

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/validation/reports?${params}`)
      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/bookings')
      const data = await response.json()

      if (data.bookings) {
        const total = data.bookings.length
        const validated = data.bookings.filter((b: any) => b.isValidated).length
        const unvalidated = total - validated

        setStatistics({
          totalBookings: total,
          validatedBookings: validated,
          unvalidatedBookings: unvalidated,
          validationRate: total > 0 ? (validated / total) * 100 : 0
        })
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const fetchReportDetails = async (reportId: string) => {
    try {
      const response = await fetch(`/api/validation/reports/${reportId}`)
      const data = await response.json()
      setSelectedReport(data)
    } catch (error) {
      console.error('Error fetching report details:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant =
      status === 'COMPLETED' ? 'default' :
      status === 'PROCESSING' ? 'secondary' :
      status === 'FAILED' ? 'destructive' :
      'outline'

    return <Badge variant={variant}>{status}</Badge>
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Booking Validation</h1>
          <p className="text-muted-foreground">
            Validate bookings against airline reports
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Report
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All bookings in system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.validatedBookings}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed with airline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unvalidated</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.unvalidatedBookings}</div>
            <p className="text-xs text-muted-foreground">
              Pending validation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.validationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of total bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Reports */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Validation Reports</CardTitle>
              <CardDescription>
                Recent airline report uploads and their processing status
              </CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reports">
            <TabsList>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              {selectedReport && (
                <TabsTrigger value="details">Report Details</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="reports" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Report #</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Unmatched</TableHead>
                      <TableHead>Partial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{getStatusIcon(report.status)}</TableCell>
                        <TableCell className="font-medium">
                          {report.reportNumber}
                        </TableCell>
                        <TableCell>{report.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.fileType}</Badge>
                        </TableCell>
                        <TableCell>{report.totalRecords}</TableCell>
                        <TableCell className="text-green-600">
                          {report.matchedRecords}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {report.unmatchedRecords}
                        </TableCell>
                        <TableCell className="text-yellow-600">
                          {report.partialMatches}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>{report.user.name}</TableCell>
                        <TableCell>
                          {format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fetchReportDetails(report.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <p className="text-muted-foreground">No validation reports found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {selectedReport && (
              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Report {selectedReport.reportNumber}
                    </h3>
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchReportDetails(selectedReport.id)
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                  <ValidationReportTable
                    results={selectedReport.results || []}
                    onResultUpdate={() => {
                      fetchReportDetails(selectedReport.id)
                      fetchReports()
                      fetchStatistics()
                    }}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <ValidationUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={() => {
          fetchReports()
          fetchStatistics()
        }}
      />
    </div>
  )
}