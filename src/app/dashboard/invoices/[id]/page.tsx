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
  Building2, Plane, Package, Users, Printer, Eye,
  RefreshCw, Edit, Save, X
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import Image from "next/image"
import { PrintInvoiceDialog } from "@/components/invoice/print-invoice-dialog"
import { InvoicePreviewModal } from "@/components/invoice/invoice-preview-modal"

export default function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedInvoice, setEditedInvoice] = useState<any>(null)

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


  const handleDownloadPDF = async () => {
    try {
      // Use the unified print-html endpoint for consistency
      const response = await fetch(`/api/invoices/${id}/print-html`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: "group", // Default to group invoice
        })
      })

      if (response.ok) {
        const data = await response.json()

        if (data.html) {
          // Open HTML in new window and trigger print dialog (user can save as PDF)
          const printWindow = window.open('', '_blank', 'width=900,height=700')

          if (printWindow) {
            printWindow.document.write(data.html)
            printWindow.document.close()
            printWindow.focus()

            // Wait for content to load, then trigger print
            setTimeout(() => {
              printWindow.print()
            }, 500)

            toast.success("Opening print dialog - you can save as PDF")
          } else {
            toast.error("Please allow popups to download PDF")
          }
        } else {
          toast.error("No invoice data received")
        }
      } else {
        toast.error("Failed to generate invoice")
      }
    } catch (error) {
      toast.error("Failed to generate invoice")
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

  const handleEditMode = () => {
    setIsEditMode(true)
    setEditedInvoice(JSON.parse(JSON.stringify(invoice))) // Deep copy
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedInvoice(null)
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(editedInvoice)
      })

      if (response.ok) {
        toast.success("Invoice updated successfully")
        setIsEditMode(false)
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
      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEditMode}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Invoice
              </Button>
              <Button variant="outline" onClick={() => setShowPreviewModal(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
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
            </>
          )}
        </div>
      </div>

      {/* Main Invoice Layout */}
      <Card className="max-w-5xl mx-auto relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-30deg]">
          <div className="relative w-96 h-96">
            <Image
              src="/images/pairin-logo.png"
              alt="Watermark"
              fill
              className="object-contain"
            />
          </div>
        </div>
        <CardContent className="p-8 relative z-10">
          {/* Top Header Section with Logo, Company Details, and Invoice Details */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b-2">
            {/* Logo Section */}
            <div className="flex items-center justify-center rounded-lg p-6">
              <div className="text-center">
                <div className="w-24 h-24 relative mx-auto mb-2">
                  <Image
                    src="/images/pairin-logo.png"
                    alt="Pairin Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="font-bold text-gray-900">PAIRIN TRAVEL</h3>
                <p className="text-xs text-gray-600">Professional Travel Services</p>
              </div>
            </div>

            {/* Company Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Company Detail</h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">Flight Booking System</p>
                <p className="text-gray-600">Thai Government Agency</p>
                <p className="text-gray-600">Bangkok, Thailand</p>
                <p className="text-gray-600">Tel: 02-000-0000</p>
                <p className="text-gray-600">Email: info@govbooking.go.th</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Invoice Detail</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-600">Invoice No:</span> <span className="font-medium">{invoice.invoiceNumber}</span></p>
                <p><span className="text-gray-600">Date:</span> <span className="font-medium">{format(new Date(invoice.createdAt), "dd/MM/yyyy")}</span></p>
                <p><span className="text-gray-600">PO No:</span> <span className="font-medium">{po.poNumber}</span></p>
                <p><span className="text-gray-600">Status:</span> {getStatusBadge(invoice.status)}</p>
                {invoice.paidAt && (
                  <p><span className="text-gray-600">Paid:</span> <span className="font-medium">{format(new Date(invoice.paidAt), "dd/MM/yyyy")}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="mb-6">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Bill To</h3>
              {po.department ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-lg">{po.department.nameEn}</p>
                  <p className="text-gray-600">{po.department.nameTh}</p>
                  <p className="text-gray-600">Department Code: {po.department.code}</p>
                  {po.department.address && <p className="text-gray-600">{po.department.address}</p>}
                  {po.department.phone && <p className="text-gray-600">Tel: {po.department.phone}</p>}
                  {po.department.email && <p className="text-gray-600">Email: {po.department.email}</p>}
                </div>
              ) : po.customer ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-lg">{po.customer.firstName} {po.customer.lastName}</p>
                  <p className="text-gray-600">Email: {po.customer.email}</p>
                  {po.customer.phone && <p className="text-gray-600">Tel: {po.customer.phone}</p>}
                </div>
              ) : null}
            </div>
          </div>

          {/* Invoice Items Section */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Invoice Items</h3>

              {/* Flight Bookings - Filter out original bookings that have been rescheduled */}
              {po.bookings && po.bookings
                .filter((booking: any) => {
                  // If this booking has been rescheduled, check if the rescheduled version exists
                  if (booking.status === 'RESCHEDULED') {
                    // Check if there's a booking with this as originalBookingId
                    const hasRescheduledVersion = po.bookings.some(
                      (b: any) => b.originalBookingId === booking.id
                    )
                    return !hasRescheduledVersion // Don't show if rescheduled version exists
                  }
                  return true // Show all other bookings
                })
                .map((booking: any, index: number) => (
                <div key={booking.id} className="bg-white shadow-sm rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800 flex items-center gap-2">
                        Flight Booking #{index + 1}
                        {booking.isChange && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            RESCHEDULED
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-gray-600">Booking Reference: {booking.bookingRef}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">฿{booking.totalAmount?.toLocaleString() || '0'}</p>
                      <Badge variant="outline">{booking.status}</Badge>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-gray-600">Flight Number: {booking.flightNumber || 'N/A'}</p>
                        <p className="text-gray-600">Route: {booking.origin || 'N/A'} → {booking.destination || 'N/A'}</p>
                        <p className="text-gray-600">Date: {booking.departureDate ? format(new Date(booking.departureDate), "dd/MM/yyyy HH:mm") : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Airline: {booking.airline || 'N/A'}</p>
                        <p className="text-gray-600">Passengers: {booking.passengers?.length || 0} person(s)</p>
                        <p className="text-gray-600">Service Fee: ฿{booking.totalServiceFee?.toLocaleString() || '0'}</p>
                        {booking.changeFee && booking.changeFee > 0 && (
                          <p className="text-gray-600">Change Fee: ฿{booking.changeFee.toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    {/* Show change reason if this is a rescheduled booking */}
                    {booking.isChange && booking.changeReason && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-gray-600"><span className="font-medium">Change Reason:</span> {booking.changeReason}</p>
                      </div>
                    )}

                    {/* Additional Charges */}
                    {((booking.baggageCharge && booking.baggageCharge > 0) ||
                      (booking.mealCharge && booking.mealCharge > 0) ||
                      (booking.seatSelectionCharge && booking.seatSelectionCharge > 0) ||
                      (booking.airportTax && booking.airportTax > 0)) && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium mb-2">Additional Charges:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {booking.baggageCharge > 0 && (
                            <div className="text-gray-600">
                              <span>• ค่าโหลดสัมภาระ:</span> <span className="font-semibold">฿{booking.baggageCharge.toLocaleString()}</span>
                            </div>
                          )}
                          {booking.mealCharge > 0 && (
                            <div className="text-gray-600">
                              <span>• ค่าอาหารและเครื่องดื่ม:</span> <span className="font-semibold">฿{booking.mealCharge.toLocaleString()}</span>
                            </div>
                          )}
                          {booking.seatSelectionCharge > 0 && (
                            <div className="text-gray-600">
                              <span>• ค่าเลือกที่นั่ง:</span> <span className="font-semibold">฿{booking.seatSelectionCharge.toLocaleString()}</span>
                            </div>
                          )}
                          {booking.airportTax > 0 && (
                            <div className="text-gray-600">
                              <span>• ค่าภาษีสนามบิน:</span> <span className="font-semibold">฿{booking.airportTax.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Passengers List */}
                    {booking.passengers && booking.passengers.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium mb-1">Passengers:</p>
                        {booking.passengers.map((passenger: any, pIndex: number) => (
                          <div key={pIndex} className="text-gray-600 ml-3">
                            <p>
                              {pIndex + 1}. {passenger.customer?.title || ''} {passenger.customer?.firstName || 'N/A'} {passenger.customer?.lastName || ''}
                              {passenger.customer?.nationality && ` (${passenger.customer.nationality})`}
                            </p>
                            {passenger.seatNumber && (
                              <p className="text-xs ml-4">Seat: {passenger.seatNumber}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Tour Bookings */}
              {po.tourBookings && po.tourBookings.map((booking: any, index: number) => (
                <div key={booking.id} className="bg-white shadow-sm rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">Tour Package #{index + 1}</h4>
                      <p className="text-sm text-gray-600">{booking.tourPackage?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">฿{booking.totalAmount?.toLocaleString() || '0'}</p>
                      <Badge variant="outline">{booking.status}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <p className="text-gray-600">Travel Date: {booking.travelDate ? format(new Date(booking.travelDate), "dd/MM/yyyy") : 'N/A'}</p>

                    {/* Passengers List for Tour */}
                    {booking.passengers && booking.passengers.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium mb-1">Passengers ({booking.passengers.length} person{booking.passengers.length > 1 ? 's' : ''}):</p>
                        {booking.passengers.map((passenger: any, pIndex: number) => (
                          <p key={pIndex} className="text-gray-600 ml-3">
                            {pIndex + 1}. {passenger.customer?.title || ''} {passenger.customer?.firstName || 'N/A'} {passenger.customer?.lastName || ''}
                            {passenger.customer?.nationality && ` (${passenger.customer.nationality})`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code and Total Amount Section */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* QR Code */}
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 text-center mb-2">QR CODE</h3>
              {invoice.qrCode ? (
                <div className="flex justify-center">
                  <Image
                    src={invoice.qrCode}
                    alt="Payment QR Code"
                    width={150}
                    height={150}
                    className="rounded"
                  />
                </div>
              ) : (
                <div className="w-[150px] h-[150px] mx-auto bg-gray-100 rounded flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <p className="text-xs text-center text-gray-600 mt-2">(link to Update payment status)</p>
            </div>

            {/* Total Amount */}
            <div className="col-span-2 bg-gray-100 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Total Amount</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">฿{invoice.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (7%):</span>
                  <span className="font-medium">฿{invoice.tax.toLocaleString()}</span>
                </div>
                {(() => {
                  const totalAirportTax = invoice.purchaseOrder?.bookings?.reduce(
                    (sum: number, booking: any) => sum + (booking.airportTax || 0),
                    0
                  ) || 0;
                  if (totalAirportTax > 0) {
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ค่าภาษีสนามบิน (Airport Tax):</span>
                        <span className="font-medium">฿{totalAirportTax.toLocaleString()}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-gray-900">฿{invoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Payment Method (Check box)</h3>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" disabled checked={invoice.paymentMethod === 'CREDIT_CARD'} />
                  <span className="text-sm">Credit Card</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" disabled checked={invoice.paymentMethod === 'BANK_TRANSFER'} />
                  <span className="text-sm">Bank Transfer</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" disabled checked={invoice.paymentMethod === 'CASH'} />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" disabled checked={invoice.paymentMethod === 'PROMPTPAY'} />
                  <span className="text-sm">PromptPay</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" disabled checked={invoice.paymentMethod === 'GOVERNMENT_BUDGET'} />
                  <span className="text-sm">Government Budget</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" disabled checked={!invoice.paymentMethod} />
                  <span className="text-sm">Other</span>
                </label>
              </div>
            </div>
          </div>

          {/* Note & Terms Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">Note & Terms</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>1. This invoice is valid for 30 days from the issue date.</p>
              <p>2. Please make payment to: Thai Government Flight Booking Account</p>
              <p>3. For any queries, please contact our customer service at 02-000-0000</p>
              <p>4. This is a system-generated invoice and does not require a signature.</p>
              <p>5. Please quote invoice number when making payment.</p>
              <Separator className="my-2" />
              <p className="text-center italic">Generated by: {invoice.user?.name || invoice.user?.email} | System Generated Invoice</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Invoice Dialog */}
      <PrintInvoiceDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        invoice={invoice}
      />

      {/* Quick Preview Modal */}
      <InvoicePreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        invoiceId={invoice?.id}
        type="group"
        onConfirmPrint={() => {
          setShowPreviewModal(false)
          setShowPrintDialog(true)
        }}
      />
    </div>
  )
}