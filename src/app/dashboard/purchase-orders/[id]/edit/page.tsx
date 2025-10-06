"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Plane, Users, DollarSign, Calculator, Plus, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BookingData {
  id: string
  bookingRef: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureDate: string
  basePrice: number
  totalCost: number
  totalServiceFee: number
  totalAmount: number
  baggageCharge?: number
  mealCharge?: number
  seatSelectionCharge?: number
  airportTax?: number
  passengers: any[]
}

interface PurchaseOrderData {
  id: string
  poNumber: string
  type: string
  status: string
  purpose?: string
  approvalRef?: string
  totalAmount: number
  cost: number
  serviceFee: number
  profit: number
  bookings: BookingData[]
  department?: any
  customer?: any
}

export default function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderData | null>(null)
  const [formData, setFormData] = useState({
    status: "",
    purpose: "",
    approvalRef: ""
  })
  const [bookingsData, setBookingsData] = useState<any[]>([])
  const [showAddFlightDialog, setShowAddFlightDialog] = useState(false)
  const [newFlightData, setNewFlightData] = useState({
    originalBookingId: "",
    flightNumber: "",
    airline: "",
    origin: "",
    destination: "",
    departureDate: "",
    costPerPassenger: 0,
    serviceFeePerPassenger: 0,
    changeFee: 0,
    changeReason: "",
    selectedPassengers: [] as string[]
  })
  const [isAddingFlight, setIsAddingFlight] = useState(false)

  useEffect(() => {
    fetchPurchaseOrder()
  }, [id])

  const fetchPurchaseOrder = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        credentials: "include"
      })

      if (response.ok) {
        const data = await response.json()
        setPurchaseOrder(data)
        setFormData({
          status: data.status || "PENDING",
          purpose: data.purpose || "",
          approvalRef: data.approvalRef || ""
        })

        // Initialize bookings data for editing
        const bookingsForEdit = data.bookings.map((booking: BookingData) => ({
          bookingId: booking.id,
          bookingRef: booking.bookingRef,
          flightNumber: booking.flightNumber || "",
          airline: booking.airline || "",
          origin: booking.origin || "",
          destination: booking.destination || "",
          departureDate: booking.departureDate ? format(new Date(booking.departureDate), "yyyy-MM-dd'T'HH:mm") : "",
          passengerCount: booking.passengers.length,
          costPerPassenger: booking.passengers.length > 0 ? booking.totalCost / booking.passengers.length : 0,
          serviceFeePerPassenger: booking.passengers.length > 0 ? booking.totalServiceFee / booking.passengers.length : 0,
          basePrice: booking.basePrice,
          totalCost: booking.totalCost,
          totalServiceFee: booking.totalServiceFee,
          totalAmount: booking.totalAmount,
          passengers: booking.passengers
        }))
        setBookingsData(bookingsForEdit)
      } else {
        toast.error("Failed to fetch purchase order")
        router.push("/dashboard/purchase-orders")
      }
    } catch (error) {
      console.error("Error fetching purchase order:", error)
      toast.error("Failed to fetch purchase order")
    } finally {
      setIsLoading(false)
    }
  }

  const updateBookingField = (bookingIndex: number, field: string, value: any) => {
    const updatedBookings = [...bookingsData]
    updatedBookings[bookingIndex] = {
      ...updatedBookings[bookingIndex],
      [field]: value
    }

    // Recalculate prices when cost, service fee, or additional charges change
    if (field === 'costPerPassenger' || field === 'serviceFeePerPassenger' ||
        field === 'baggageCharge' || field === 'mealCharge' || field === 'seatSelectionCharge' || field === 'airportTax') {
      const booking = updatedBookings[bookingIndex]
      const costPerPassenger = field === 'costPerPassenger' ? value : booking.costPerPassenger
      const serviceFeePerPassenger = field === 'serviceFeePerPassenger' ? value : booking.serviceFeePerPassenger

      // Calculate new values
      const basePrice = costPerPassenger + serviceFeePerPassenger
      const totalCost = costPerPassenger * booking.passengerCount
      const totalServiceFee = serviceFeePerPassenger * booking.passengerCount

      // Include all additional charges in totalAmount
      const baggageCharge = field === 'baggageCharge' ? value : (booking.baggageCharge || 0)
      const mealCharge = field === 'mealCharge' ? value : (booking.mealCharge || 0)
      const seatSelectionCharge = field === 'seatSelectionCharge' ? value : (booking.seatSelectionCharge || 0)
      const airportTax = field === 'airportTax' ? value : (booking.airportTax || 0)

      const totalAmount = (basePrice * booking.passengerCount) + baggageCharge + mealCharge + seatSelectionCharge + airportTax

      updatedBookings[bookingIndex] = {
        ...booking,
        [field]: value,
        basePrice,
        totalCost,
        totalServiceFee,
        baggageCharge,
        mealCharge,
        seatSelectionCharge,
        airportTax,
        totalAmount
      }
    }

    setBookingsData(updatedBookings)
  }

  const calculateGrandTotals = () => {
    const totals = bookingsData.reduce((acc, booking) => ({
      totalCost: acc.totalCost + (booking.totalCost || 0),
      totalServiceFee: acc.totalServiceFee + (booking.totalServiceFee || 0),
      totalAmount: acc.totalAmount + (booking.totalAmount || 0),
      totalPassengers: acc.totalPassengers + booking.passengerCount
    }), { totalCost: 0, totalServiceFee: 0, totalAmount: 0, totalPassengers: 0 })

    return {
      ...totals,
      totalProfit: totals.totalAmount - totals.totalCost - totals.totalServiceFee
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          bookings: bookingsData
        })
      })

      if (response.ok) {
        toast.success("Purchase order updated successfully")
        router.push(`/dashboard/purchase-orders/${id}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update purchase order")
      }
    } catch (error) {
      console.error("Error updating purchase order:", error)
      toast.error("Failed to update purchase order")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Purchase order not found</p>
        <Button onClick={() => router.push("/dashboard/purchase-orders")} className="mt-4">
          Back to Purchase Orders
        </Button>
      </div>
    )
  }

  const grandTotals = calculateGrandTotals()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Purchase Order</h2>
          <p className="text-muted-foreground">
            Update purchase order #{purchaseOrder.poNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purchase Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
            <CardDescription>
              Update the status and details of this purchase order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input value={purchaseOrder.poNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={purchaseOrder.type} disabled />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Department/Customer</Label>
                <Input
                  value={
                    purchaseOrder.department
                      ? `${purchaseOrder.department.nameEn} (${purchaseOrder.department.code})`
                      : purchaseOrder.customer
                      ? `${purchaseOrder.customer.firstName} ${purchaseOrder.customer.lastName}`
                      : "N/A"
                  }
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={
                    purchaseOrder.department?.paymentTerms
                      ? `${purchaseOrder.department.paymentTerms} days`
                      : purchaseOrder.customer?.paymentTerms
                      ? `${purchaseOrder.customer.paymentTerms} days`
                      : "N/A"
                  }
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status*</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                placeholder="Enter the purpose of this purchase order"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approvalRef">Approval Reference</Label>
              <Input
                id="approvalRef"
                value={formData.approvalRef}
                onChange={(e) => setFormData({...formData, approvalRef: e.target.value})}
                placeholder="Enter approval reference number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Flight Change Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Bookings</h3>
          <Button
            type="button"
            onClick={() => setShowAddFlightDialog(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Flight Change
          </Button>
        </div>

        {/* Bookings Section */}
        {bookingsData.map((booking, index) => (
          <Card key={booking.bookingId}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Booking #{booking.bookingRef}
                  </CardTitle>
                  <CardDescription>
                    {booking.passengerCount} passenger(s)
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {booking.passengerCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Flight Information */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Flight Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Flight Number</Label>
                    <Input
                      value={booking.flightNumber}
                      onChange={(e) => updateBookingField(index, 'flightNumber', e.target.value)}
                      placeholder="e.g., TG123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Airline</Label>
                    <Input
                      value={booking.airline}
                      onChange={(e) => updateBookingField(index, 'airline', e.target.value)}
                      placeholder="e.g., Thai Airways"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origin</Label>
                    <Input
                      value={booking.origin}
                      onChange={(e) => updateBookingField(index, 'origin', e.target.value)}
                      placeholder="e.g., Bangkok (BKK)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input
                      value={booking.destination}
                      onChange={(e) => updateBookingField(index, 'destination', e.target.value)}
                      placeholder="e.g., Tokyo (NRT)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={booking.departureDate}
                      onChange={(e) => updateBookingField(index, 'departureDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pricing Information */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Pricing (Per Passenger)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cost per Passenger (฿)</Label>
                    <Input
                      type="number"
                      value={booking.costPerPassenger}
                      onChange={(e) => updateBookingField(index, 'costPerPassenger', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Fee per Passenger (฿)</Label>
                    <Input
                      type="number"
                      value={booking.serviceFeePerPassenger}
                      onChange={(e) => updateBookingField(index, 'serviceFeePerPassenger', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Price per Passenger (฿)</Label>
                    <div className="flex items-center h-10 px-3 py-2 bg-muted rounded-md">
                      <span className="font-semibold">฿{booking.basePrice.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-calculated</p>
                  </div>
                </div>

                {/* Additional Charges Section */}
                <div className="mt-4 p-4 border rounded-lg bg-blue-50/50">
                  <h5 className="text-sm font-medium mb-3 text-blue-900">Additional Charges (Total for all passengers)</h5>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>ค่าโหลดสัมภาระ (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.baggageCharge || 0}
                        onChange={(e) => updateBookingField(index, 'baggageCharge', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Baggage Charge</p>
                    </div>
                    <div>
                      <Label>ค่าอาหารและเครื่องดื่ม (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.mealCharge || 0}
                        onChange={(e) => updateBookingField(index, 'mealCharge', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Meal & Beverage</p>
                    </div>
                    <div>
                      <Label>ค่าเลือกที่นั่ง (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.seatSelectionCharge || 0}
                        onChange={(e) => updateBookingField(index, 'seatSelectionCharge', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Seat Selection</p>
                    </div>
                    <div>
                      <Label>ค่าภาษีสนามบิน (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.airportTax || 0}
                        onChange={(e) => updateBookingField(index, 'airportTax', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Airport Tax (no VAT)</p>
                    </div>
                  </div>
                </div>

                {/* Totals for this booking */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Calculated Totals for {booking.passengerCount} Passenger(s)
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground">Base Amount (Price × Passengers)</p>
                      <p className="font-semibold">฿{(booking.basePrice * booking.passengerCount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Additional Charges</p>
                      <p className="font-semibold">
                        ฿{((booking.baggageCharge || 0) + (booking.mealCharge || 0) + (booking.seatSelectionCharge || 0) + (booking.airportTax || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Cost</p>
                      <p className="font-semibold">฿{booking.totalCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Service Fee</p>
                      <p className="font-semibold">฿{booking.totalServiceFee.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-lg text-blue-600">฿{booking.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit</p>
                      <p className="font-semibold text-green-600">
                        ฿{(booking.totalAmount - booking.totalCost - booking.totalServiceFee).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passengers List (Read-only) */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Passengers
                </h4>
                <div className="space-y-2">
                  {booking.passengers.map((passenger: any, pIndex: number) => (
                    <div key={pIndex} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Badge variant="secondary">{pIndex + 1}</Badge>
                      <span>
                        {passenger.customer.title} {passenger.customer.firstName} {passenger.customer.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({passenger.customer.email})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Grand Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Grand Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold">{grandTotals.totalPassengers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">฿{grandTotals.totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Service Fee</p>
                <p className="text-2xl font-bold">฿{grandTotals.totalServiceFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">฿{grandTotals.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  ฿{grandTotals.totalProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Add Flight Change Dialog */}
      <Dialog open={showAddFlightDialog} onOpenChange={setShowAddFlightDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Flight Change</DialogTitle>
            <DialogDescription>
              Add a new flight booking for passengers who need to change their original flight.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Select Original Booking */}
            <div className="space-y-2">
              <Label>Select Original Booking to Change</Label>
              <Select
                value={newFlightData.originalBookingId}
                onValueChange={(value) => setNewFlightData({...newFlightData, originalBookingId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookingsData.map((booking) => (
                    <SelectItem key={booking.bookingId} value={booking.bookingId}>
                      {booking.bookingRef} - {booking.flightNumber} ({booking.passengerCount} passengers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Passengers */}
            {newFlightData.originalBookingId && (
              <div className="space-y-2">
                <Label>Select Passengers for Flight Change</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {bookingsData
                    .find(b => b.bookingId === newFlightData.originalBookingId)
                    ?.passengers.map((passenger: any) => (
                      <label key={passenger.customer.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newFlightData.selectedPassengers.includes(passenger.customer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewFlightData({
                                ...newFlightData,
                                selectedPassengers: [...newFlightData.selectedPassengers, passenger.customer.id]
                              })
                            } else {
                              setNewFlightData({
                                ...newFlightData,
                                selectedPassengers: newFlightData.selectedPassengers.filter(id => id !== passenger.customer.id)
                              })
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {passenger.customer.title} {passenger.customer.firstName} {passenger.customer.lastName}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            <Separator />

            {/* New Flight Information */}
            <h4 className="font-medium">New Flight Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flight Number*</Label>
                <Input
                  value={newFlightData.flightNumber}
                  onChange={(e) => setNewFlightData({...newFlightData, flightNumber: e.target.value})}
                  placeholder="e.g., TG456"
                />
              </div>
              <div className="space-y-2">
                <Label>Airline*</Label>
                <Input
                  value={newFlightData.airline}
                  onChange={(e) => setNewFlightData({...newFlightData, airline: e.target.value})}
                  placeholder="e.g., Thai Airways"
                />
              </div>
              <div className="space-y-2">
                <Label>Origin*</Label>
                <Input
                  value={newFlightData.origin}
                  onChange={(e) => setNewFlightData({...newFlightData, origin: e.target.value})}
                  placeholder="e.g., Bangkok (BKK)"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination*</Label>
                <Input
                  value={newFlightData.destination}
                  onChange={(e) => setNewFlightData({...newFlightData, destination: e.target.value})}
                  placeholder="e.g., Tokyo (NRT)"
                />
              </div>
              <div className="space-y-2">
                <Label>Departure Date & Time*</Label>
                <Input
                  type="datetime-local"
                  value={newFlightData.departureDate}
                  onChange={(e) => setNewFlightData({...newFlightData, departureDate: e.target.value})}
                />
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <h4 className="font-medium">Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost per Passenger (฿)*</Label>
                <Input
                  type="number"
                  value={newFlightData.costPerPassenger}
                  onChange={(e) => setNewFlightData({...newFlightData, costPerPassenger: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Service Fee per Passenger (฿)*</Label>
                <Input
                  type="number"
                  value={newFlightData.serviceFeePerPassenger}
                  onChange={(e) => setNewFlightData({...newFlightData, serviceFeePerPassenger: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Change Fee per Passenger (฿)</Label>
                <Input
                  type="number"
                  value={newFlightData.changeFee}
                  onChange={(e) => setNewFlightData({...newFlightData, changeFee: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Change Reason */}
            <div className="space-y-2">
              <Label>Reason for Change</Label>
              <Textarea
                value={newFlightData.changeReason}
                onChange={(e) => setNewFlightData({...newFlightData, changeReason: e.target.value})}
                placeholder="Enter the reason for this flight change"
                rows={3}
              />
            </div>

            {/* Summary */}
            {newFlightData.selectedPassengers.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Selected Passengers: {newFlightData.selectedPassengers.length}</p>
                    <p>Base Price per Passenger: ฿{(newFlightData.costPerPassenger + newFlightData.serviceFeePerPassenger).toLocaleString()}</p>
                    <p>Change Fee Total: ฿{(newFlightData.changeFee * newFlightData.selectedPassengers.length).toLocaleString()}</p>
                    <p className="font-semibold">
                      Total Amount: ฿{(
                        ((newFlightData.costPerPassenger + newFlightData.serviceFeePerPassenger) * newFlightData.selectedPassengers.length) +
                        (newFlightData.changeFee * newFlightData.selectedPassengers.length)
                      ).toLocaleString()}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddFlightDialog(false)
                setNewFlightData({
                  originalBookingId: "",
                  flightNumber: "",
                  airline: "",
                  origin: "",
                  destination: "",
                  departureDate: "",
                  costPerPassenger: 0,
                  serviceFeePerPassenger: 0,
                  changeFee: 0,
                  changeReason: "",
                  selectedPassengers: []
                })
              }}
              disabled={isAddingFlight}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsAddingFlight(true)
                try {
                  // Get selected passengers data
                  const originalBooking = bookingsData.find(b => b.bookingId === newFlightData.originalBookingId)
                  const passengers = originalBooking?.passengers
                    .filter((p: any) => newFlightData.selectedPassengers.includes(p.customer.id))
                    .map((p: any) => ({
                      customerId: p.customer.id,
                      title: p.customer.title,
                      firstName: p.customer.firstName,
                      lastName: p.customer.lastName,
                      email: p.customer.email,
                      phone: p.customer.phone,
                      nationalId: p.customer.nationalId,
                      passportNo: p.customer.passportNo,
                      dateOfBirth: p.customer.dateOfBirth,
                      nationality: p.customer.nationality || "Thai"
                    }))

                  const response = await fetch(`/api/purchase-orders/${id}/add-booking`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                      originalBookingId: newFlightData.originalBookingId,
                      changeFee: newFlightData.changeFee,
                      changeReason: newFlightData.changeReason,
                      flightNumber: newFlightData.flightNumber,
                      airline: newFlightData.airline,
                      origin: newFlightData.origin,
                      destination: newFlightData.destination,
                      departureDate: newFlightData.departureDate,
                      costPerPassenger: newFlightData.costPerPassenger,
                      serviceFeePerPassenger: newFlightData.serviceFeePerPassenger,
                      passengers
                    })
                  })

                  if (response.ok) {
                    toast.success("Flight change added successfully")
                    setShowAddFlightDialog(false)
                    // Refresh the page data
                    fetchPurchaseOrder()
                  } else {
                    const error = await response.json()
                    toast.error(error.error || "Failed to add flight change")
                  }
                } catch (error) {
                  console.error("Error adding flight change:", error)
                  toast.error("Failed to add flight change")
                } finally {
                  setIsAddingFlight(false)
                }
              }}
              disabled={
                isAddingFlight ||
                !newFlightData.flightNumber ||
                !newFlightData.airline ||
                !newFlightData.origin ||
                !newFlightData.destination ||
                !newFlightData.departureDate ||
                newFlightData.selectedPassengers.length === 0
              }
            >
              {isAddingFlight ? "Adding..." : "Add Flight Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}