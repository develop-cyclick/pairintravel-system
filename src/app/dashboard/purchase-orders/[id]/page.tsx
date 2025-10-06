"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Plane,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Download,
  Check,
  X,
  Clock,
  AlertCircle,
  RefreshCw,
  Route
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { RescheduleBookingDialog } from "@/components/bookings/RescheduleBookingDialog"
import { ReRouteBookingDialog } from "@/components/bookings/ReRouteBookingDialog"

interface PurchaseOrderDetails {
  id: string
  poNumber: string
  type: "FLIGHT" | "TOUR"
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
  totalAmount: number
  cost: number
  serviceFee: number
  profit: number
  purpose?: string
  approvalRef?: string
  createdAt: string
  updatedAt: string
  user: {
    name: string
    email: string
  }
  department?: {
    code: string
    nameEn: string
    nameTh: string
  }
  customer?: {
    title: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  bookings: Array<{
    id: string
    bookingRef: string
    flightNumber: string
    airline: string
    origin: string
    destination: string
    departureDate: string
    totalAmount: number
    passengers: Array<{
      customer: {
        title: string
        firstName: string
        lastName: string
        email: string
        phone: string
        nationality: string
      }
    }>
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    totalAmount: number
    status: string
    createdAt: string
  }>
}

export default function PurchaseOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState({
    status: "",
    purpose: "",
    approvalRef: ""
  })
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [showReRouteDialog, setShowReRouteDialog] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPurchaseOrder()
  }, [id])

  const fetchPurchaseOrder = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPurchaseOrder(data)
        setEditData({
          status: data.status,
          purpose: data.purpose || "",
          approvalRef: data.approvalRef || ""
        })
      } else {
        toast.error("Failed to fetch purchase order details")
        router.push("/dashboard/purchase-orders")
      }
    } catch (error) {
      console.error("Error fetching purchase order:", error)
      toast.error("Failed to fetch purchase order details")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Purchase order deleted successfully")
        router.push("/dashboard/purchase-orders")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to delete purchase order")
      }
    } catch (error) {
      console.error("Error deleting purchase order:", error)
      toast.error("Failed to delete purchase order")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        const updatedPO = await response.json()
        setPurchaseOrder(updatedPO)
        toast.success("Purchase order updated successfully")
        setShowEditDialog(false)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update purchase order")
      }
    } catch (error) {
      console.error("Error updating purchase order:", error)
      toast.error("Failed to update purchase order")
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true)
    try {
      const response = await fetch(`/api/purchase-orders/${id}/invoice`, {
        method: "POST"
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Invoice created successfully")
        router.push(`/dashboard/invoices/${data.invoice.id}`)
      } else {
        if (data.invoice) {
          // Invoice already exists, navigate to it
          toast.info("Invoice already exists for this purchase order")
          router.push(`/dashboard/invoices/${data.invoice.id}`)
        } else {
          toast.error(data.error || "Failed to create invoice")
        }
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      toast.error("Failed to create invoice")
    } finally {
      setCreatingInvoice(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <Check className="h-4 w-4" />
      case "PENDING": return <Clock className="h-4 w-4" />
      case "CANCELLED": return <X className="h-4 w-4" />
      case "COMPLETED": return <Check className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "default"
      case "PENDING": return "secondary"
      case "CANCELLED": return "destructive"
      case "COMPLETED": return "default"
      default: return "outline"
    }
  }

  const handleReschedule = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setShowRescheduleDialog(true)
  }

  const handleRescheduleSuccess = () => {
    setShowRescheduleDialog(false)
    setSelectedBookingId(null)
    fetchPurchaseOrder() // Refresh the data
    toast.success("Booking rescheduled successfully")
  }

  const handleReRoute = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setShowReRouteDialog(true)
  }

  const handleReRouteSuccess = () => {
    setShowReRouteDialog(false)
    setSelectedBookingId(null)
    fetchPurchaseOrder() // Refresh the data
    toast.success("Booking re-routed successfully")
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading purchase order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Purchase order not found</p>
          <Button onClick={() => router.push("/dashboard/purchase-orders")} className="mt-4">
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/purchase-orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{purchaseOrder.poNumber}</h1>
          <p className="text-muted-foreground mt-2">
            Created on {format(new Date(purchaseOrder.createdAt), "PPP")}
          </p>
        </div>
        <div className="flex gap-2">
          {purchaseOrder.invoices.length === 0 && purchaseOrder.status === "CONFIRMED" && (
            <Button onClick={handleCreateInvoice} disabled={creatingInvoice}>
              <FileText className="h-4 w-4 mr-2" />
              {creatingInvoice ? "Creating..." : "Create Invoice"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {purchaseOrder.invoices.length === 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Status and Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusColor(purchaseOrder.status)}>
              {getStatusIcon(purchaseOrder.status)}
              <span className="ml-1">{purchaseOrder.status}</span>
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{purchaseOrder.totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{purchaseOrder.profit.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseOrder.bookings.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer/Department Information */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrder.department ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">
                  {purchaseOrder.department.code} - {purchaseOrder.department.nameEn}
                </span>
              </div>
              {purchaseOrder.department.nameTh && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thai Name:</span>
                  <span className="font-medium">{purchaseOrder.department.nameTh}</span>
                </div>
              )}
            </div>
          ) : purchaseOrder.customer ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">
                  {purchaseOrder.customer.title} {purchaseOrder.customer.firstName} {purchaseOrder.customer.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{purchaseOrder.customer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{purchaseOrder.customer.phone}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No customer information</p>
          )}

          {purchaseOrder.purpose && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-muted-foreground mb-1">Purpose:</p>
                <p className="font-medium">{purchaseOrder.purpose}</p>
              </div>
            </>
          )}

          {purchaseOrder.approvalRef && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-1">Approval Reference:</p>
              <p className="font-medium">{purchaseOrder.approvalRef}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Flight Bookings</CardTitle>
          <CardDescription>
            {purchaseOrder.bookings.length} booking(s) in this purchase order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {purchaseOrder.bookings.map((booking, index) => (
            <div
              key={booking.id}
              className={`border rounded-lg p-4 ${
                booking.isChange ? 'bg-orange-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">Booking {index + 1}</h4>
                    {booking.isChange && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Rescheduled
                      </Badge>
                    )}
                    {booking.status === "RESCHEDULED" && !booking.isChange && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Rescheduled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{booking.bookingRef}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>
                    <Plane className="h-3 w-3 mr-1" />
                    {booking.flightNumber}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReschedule(booking.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReRoute(booking.id)}
                  >
                    <Route className="h-4 w-4 mr-1" />
                    Re-Route
                  </Button>
                </div>
              </div>

              {/* Outbound Flight */}
              <div className="mb-4">
                <h4 className="font-medium text-sm mb-2">Outbound Flight</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">PNR/Booking Ref:</span>
                      <span className="font-mono font-semibold">{booking.bookingRef}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.origin} → {booking.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(booking.departureDate), "PPp")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.passengers.length} passenger(s)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>฿{booking.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Flight (if exists) */}
              {booking.returnBookingRef && booking.returnFlightNumber && (
                <div className="mb-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    Return Flight
                    <Badge variant="outline" className="text-xs">
                      <Plane className="h-3 w-3 mr-1" />
                      {booking.returnFlightNumber}
                    </Badge>
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Return PNR:</span>
                        <span className="font-mono font-semibold">{booking.returnBookingRef}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.returnOrigin} → {booking.returnDestination}</span>
                      </div>
                      {booking.returnDepartureDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(booking.returnDepartureDate), "PPp")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {booking.returnAirline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.returnAirline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Passengers */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Passengers:</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {booking.passengers.map((passenger, pIndex) => (
                    <div key={pIndex} className="text-sm">
                      {pIndex + 1}. {passenger.customer.title} {passenger.customer.firstName} {passenger.customer.lastName}
                      <span className="text-muted-foreground ml-2">({passenger.customer.nationality})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show reschedule information if this is a rescheduled booking */}
              {booking.isChange && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-orange-900">Reschedule Information</p>
                      {booking.changeFee > 0 && (
                        <p className="text-orange-700">Additional Fee: ฿{booking.changeFee.toLocaleString()}</p>
                      )}
                      {booking.changeReason && (
                        <p className="text-orange-700">Reason: {booking.changeReason}</p>
                      )}
                      {booking.originalBookingId && (
                        <p className="text-orange-700 text-xs">Original Booking Reference: {booking.originalBookingId}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invoices */}
      {purchaseOrder.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {purchaseOrder.invoices.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Created on {format(new Date(invoice.createdAt), "PPP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
                      {invoice.status}
                    </Badge>
                    <span className="font-semibold">฿{invoice.totalAmount.toLocaleString()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update the purchase order details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={editData.purpose}
                onChange={(e) => setEditData({ ...editData, purpose: e.target.value })}
                placeholder="Enter purpose of travel"
              />
            </div>
            <div>
              <Label htmlFor="approvalRef">Approval Reference</Label>
              <Input
                id="approvalRef"
                value={editData.approvalRef}
                onChange={(e) => setEditData({ ...editData, approvalRef: e.target.value })}
                placeholder="Enter approval reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the purchase order "{purchaseOrder.poNumber}" 
              and all associated bookings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Booking Dialog */}
      <RescheduleBookingDialog
        bookingId={selectedBookingId}
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        onSuccess={handleRescheduleSuccess}
      />

      <ReRouteBookingDialog
        bookingId={selectedBookingId}
        open={showReRouteDialog}
        onOpenChange={setShowReRouteDialog}
        onSuccess={handleReRouteSuccess}
      />
    </div>
  )
}