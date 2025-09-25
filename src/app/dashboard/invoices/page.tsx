"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle,
  Clock,
  XCircle,
  QrCode,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Invoice {
  id: string
  invoiceNumber: string
  booking: {
    id: string
    bookingRef: string
    flight: {
      flightNumber: string
      origin: string
      destination: string
    }
    passengers: Array<{
      customer: {
        firstName: string
        lastName: string
      }
    }>
  }
  amount: number
  tax: number
  totalAmount: number
  status: string
  qrCode?: string
  pdfUrl?: string
  createdAt: string
  paidAt?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showQRDialog, setShowQRDialog] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      
      const response = await fetch(`/api/invoices?${params}`)
      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error("Error fetching invoices:", error)
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "BANK_TRANSFER",
          transactionId: `TXN${Date.now()}`
        })
      })

      if (!response.ok) throw new Error("Failed to confirm payment")

      toast.success("Payment confirmed successfully")
      fetchInvoices()
    } catch (error) {
      toast.error("Failed to confirm payment")
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      PAID: { variant: "default" as const, icon: CheckCircle, label: "Paid" },
      CANCELLED: { variant: "destructive" as const, icon: XCircle, label: "Cancelled" },
      REFUNDED: { variant: "outline" as const, icon: FileText, label: "Refunded" }
    }
    
    const { variant, icon: Icon, label } = config[status] || config.PENDING
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.booking.bookingRef.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">
            Manage invoices and payment confirmations
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(i => i.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(i => i.status === "PAID").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{invoices
                .filter(i => i.status === "PAID")
                .reduce((sum, i) => sum + i.totalAmount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            All generated invoices and their payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading invoices...</p>
          ) : filteredInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No invoices found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer/Department</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.purchaseOrder?.poNumber || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.purchaseOrder?.type || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.purchaseOrder?.bookings?.length || 0} bookings
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.purchaseOrder?.customer ? (
                        <>{invoice.purchaseOrder.customer.firstName} {invoice.purchaseOrder.customer.lastName}</>
                      ) : invoice.purchaseOrder?.department ? (
                        invoice.purchaseOrder.department.nameEn
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>฿{invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>฿{invoice.tax.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">
                      ฿{invoice.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setShowQRDialog(true)
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirmPayment(invoice.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to process payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice?.qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={selectedInvoice.qrCode} 
                  alt="Payment QR Code" 
                  className="w-64 h-64"
                />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  ฿{selectedInvoice.totalAmount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Invoice: {selectedInvoice.invoiceNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  PO: {selectedInvoice.purchaseOrder?.poNumber}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice && !showQRDialog} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Invoice Number</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Purchase Order</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.purchaseOrder?.poNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoice.purchaseOrder?.type} - {selectedInvoice.purchaseOrder?.bookings?.length || 0} bookings
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Customer/Department</p>
                <div className="space-y-1">
                  {selectedInvoice.purchaseOrder?.customer ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.purchaseOrder.customer.firstName} {selectedInvoice.purchaseOrder.customer.lastName}
                    </p>
                  ) : selectedInvoice.purchaseOrder?.department ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.purchaseOrder.department.nameEn}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>฿{selectedInvoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (7%)</span>
                    <span>฿{selectedInvoice.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>฿{selectedInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowQRDialog(true)
                  }}
                  className="flex-1"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Show QR Code
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}