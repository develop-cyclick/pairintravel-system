"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, Download, Send, CheckCircle, XCircle,
  Calendar, DollarSign, FileText, QrCode, User,
  Building2, Plane, Package, Users, Printer
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import Image from "next/image"
import { PrintInvoiceDialog } from "@/components/invoice/print-invoice-dialog"

export default function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPrintDialog, setShowPrintDialog] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        credentials: "include"
      })

      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      } else {
        toast.error("Failed to fetch invoice")
        router.push("/dashboard/invoices")
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      toast.error("Failed to fetch invoice")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrintInvoice = async (type: "individual" | "group", passengerIds?: string[]) => {
    try {
      const response = await fetch(`/api/invoices/${id}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ type, passengerIds })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Download each generated PDF
        for (let i = 0; i < data.pdfUrls.length; i++) {
          const pdfUrl = data.pdfUrls[i]
          const link = document.createElement('a')
          link.href = pdfUrl
          link.download = `invoice-${invoice.invoiceNumber}${type === 'individual' ? `-${i+1}` : ''}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          // Add a small delay between downloads if multiple files
          if (data.pdfUrls.length > 1 && i < data.pdfUrls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        toast.success(`${data.pdfUrls.length} invoice${data.pdfUrls.length > 1 ? 's' : ''} generated successfully`)
      } else {
        toast.error("Failed to generate invoice")
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice")
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/pdf`, {
        credentials: "include"
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoice.invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Invoice downloaded successfully")
      } else {
        toast.error("Failed to download invoice")
      }
    } catch (error) {
      toast.error("Failed to download invoice")
    }
  }

  const handleSendEmail = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/send-email`, {
        method: "POST",
        credentials: "include"
      })

      if (response.ok) {
        toast.success("Invoice sent via email successfully")
      } else {
        toast.error("Failed to send invoice")
      }
    } catch (error) {
      toast.error("Failed to send invoice")
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/confirm-payment`, {
        method: "POST",
        credentials: "include"
      })

      if (response.ok) {
        toast.success("Invoice marked as paid")
        fetchInvoice()
      } else {
        toast.error("Failed to update invoice")
      }
    } catch (error) {
      toast.error("Failed to update invoice")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      PAID: "default",
      CANCELLED: "destructive",
      REFUNDED: "outline"
    }
    
    const icons: Record<string, any> = {
      PENDING: <Calendar className="h-3 w-3" />,
      PAID: <CheckCircle className="h-3 w-3" />,
      CANCELLED: <XCircle className="h-3 w-3" />,
      REFUNDED: <ArrowLeft className="h-3 w-3" />
    }
    
    return (
      <Badge variant={variants[status] || "default"} className="flex items-center gap-1">
        {icons[status]}
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push("/dashboard/invoices")} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    )
  }

  const po = invoice.purchaseOrder

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Invoice #{invoice.invoiceNumber}</h2>
            <p className="text-muted-foreground">
              Created on {format(new Date(invoice.createdAt), "dd MMM yyyy, HH:mm")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPrintDialog(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleSendEmail}>
            <Send className="mr-2 h-4 w-4" />
            Send Email
          </Button>
          {invoice.status === "PENDING" && (
            <Button onClick={handleMarkAsPaid}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(invoice.status)}
            {invoice.paidAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Paid on {format(new Date(invoice.paidAt), "dd MMM yyyy")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{invoice.totalAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Subtotal: ฿{invoice.amount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              VAT (7%): ฿{invoice.tax.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Purchase Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{po.poNumber}</div>
            <Badge variant="outline" className="mt-2">
              {po.type === "FLIGHT" ? <Plane className="h-3 w-3 mr-1" /> : <Package className="h-3 w-3 mr-1" />}
              {po.type}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {po.department ? (
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{po.department.nameEn}</p>
                <p className="text-sm text-muted-foreground">{po.department.nameTh}</p>
                <p className="text-sm text-muted-foreground">Code: {po.department.code}</p>
                {po.department.phone && (
                  <p className="text-sm text-muted-foreground">Phone: {po.department.phone}</p>
                )}
                {po.department.email && (
                  <p className="text-sm text-muted-foreground">Email: {po.department.email}</p>
                )}
              </div>
            </div>
          ) : po.customer ? (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{po.customer.firstName} {po.customer.lastName}</p>
                <p className="text-sm text-muted-foreground">{po.customer.email}</p>
                {po.customer.phone && (
                  <p className="text-sm text-muted-foreground">Phone: {po.customer.phone}</p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          {po.bookings && po.bookings.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flight Bookings
              </h4>
              {po.bookings.map((booking: any, index: number) => (
                <div key={booking.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">Booking #{index + 1}</p>
                      <p className="text-sm text-muted-foreground">Ref: {booking.bookingRef}</p>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Passengers</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {booking.passengers?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">฿{booking.totalAmount?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {po.tourBookings && po.tourBookings.length > 0 && (
            <div className="space-y-4 mt-4">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Tour Package Bookings
              </h4>
              {po.tourBookings.map((booking: any, index: number) => (
                <div key={booking.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{booking.tourPackage?.name}</p>
                      <p className="text-sm text-muted-foreground">Booking #{index + 1}</p>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Passengers</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {booking.passengers?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">฿{booking.totalAmount?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment QR Code */}
      {invoice.qrCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Payment QR Code
            </CardTitle>
            <CardDescription>
              Scan this QR code to process payment
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="border-2 border-dashed border-muted rounded-lg p-4">
              <Image
                src={invoice.qrCode}
                alt="Payment QR Code"
                width={200}
                height={200}
                className="rounded"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Invoice generated by {invoice.user?.name || invoice.user?.email}</p>
            <p>System generated invoice - No signature required</p>
          </div>
        </CardContent>
      </Card>

      {/* Print Invoice Dialog */}
      <PrintInvoiceDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        invoice={invoice}
        onPrint={handlePrintInvoice}
      />
    </div>
  )
}