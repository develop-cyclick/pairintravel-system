"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, AlertCircle, Calendar, MapPin, Plane, CreditCard, Users, RefreshCw, DollarSign, Clock } from "lucide-react"
import { format, parse } from "date-fns"

const rescheduleSchema = z.object({
  flightNumber: z.string().min(1, "Please enter flight number"),
  airline: z.string().min(1, "Please enter airline"),
  departureDate: z.string().min(1, "Please enter departure date"),
  basePrice: z.number().min(0, "Please enter valid price"),
  additionalFee: z.number().min(0, "Additional fee must be positive"),
  airportTax: z.number().min(0, "Airport tax must be positive"),
  passengerIds: z.array(z.string()).optional(),
  reason: z.string().optional()
})

type RescheduleFormValues = z.infer<typeof rescheduleSchema>

interface RescheduleBookingDialogProps {
  bookingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const RESCHEDULE_FEE_PER_PASSENGER = 500 // ฿500 per passenger

export function RescheduleBookingDialog({
  bookingId,
  open,
  onOpenChange,
  onSuccess
}: RescheduleBookingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([])
  const [showPassengerSelection, setShowPassengerSelection] = useState(false)

  const form = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      flightNumber: "",
      airline: "",
      departureDate: "",
      basePrice: 0,
      additionalFee: 500, // Default reschedule fee
      airportTax: 0,
      passengerIds: [],
      reason: ""
    },
  })

  useEffect(() => {
    if (bookingId && open) {
      fetchBookingDetails()
    }
  }, [bookingId, open])

  useEffect(() => {
    if (booking) {
      // Show passenger selection for multi-passenger bookings
      setShowPassengerSelection(booking.passengers && booking.passengers.length > 1)
      // Default to all passengers selected
      if (booking.passengers) {
        setSelectedPassengers(booking.passengers.map((p: any) => p.id))
      }
      // Pre-fill with original flight data
      form.setValue("airline", booking.airline || "")
      form.setValue("basePrice", booking.basePrice || 0)
    }
  }, [booking, form])

  const fetchBookingDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        credentials: "include"
      })
      if (response.ok) {
        const data = await response.json()
        setBooking(data)
      }
    } catch (error) {
      console.error("Error fetching booking details:", error)
      toast.error("Failed to load booking details")
    } finally {
      setLoading(false)
    }
  }


  const handlePassengerToggle = (passengerId: string) => {
    setSelectedPassengers(prev => {
      if (prev.includes(passengerId)) {
        return prev.filter(id => id !== passengerId)
      } else {
        return [...prev, passengerId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedPassengers.length === booking.passengers.length) {
      setSelectedPassengers([])
    } else {
      setSelectedPassengers(booking.passengers.map((p: any) => p.id))
    }
  }

  const calculatePricing = () => {
    if (!booking || selectedPassengers.length === 0) return null

    const basePrice = form.watch("basePrice") || 0
    const additionalFee = form.watch("additionalFee") || 0
    const airportTax = form.watch("airportTax") || 0
    const passengerCount = selectedPassengers.length
    // For reschedule, passengers keep original price and only pay reschedule fee
    const originalCostPerPassenger = booking.totalCost / booking.passengers.length
    const originalFlightPrice = originalCostPerPassenger * passengerCount
    const rescheduleFee = additionalFee * passengerCount
    const serviceFee = (booking.totalServiceFee / booking.passengers.length) * passengerCount
    const total = originalFlightPrice + rescheduleFee + serviceFee + airportTax

    return {
      passengerCount,
      newFlightPrice: originalFlightPrice, // Show as original price, not new price
      rescheduleFee,
      serviceFee,
      airportTax,
      total,
      perPassenger: total / passengerCount
    }
  }

  const onSubmit = async (values: RescheduleFormValues) => {
    if (showPassengerSelection && selectedPassengers.length === 0) {
      toast.error("Please select at least one passenger to reschedule")
      return
    }

    setSubmitting(true)
    try {
      // Use departure date with default time
      const departureDateTime = new Date(`${values.departureDate}T10:00:00`)

      const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          newFlight: {
            flightNumber: values.flightNumber,
            airline: values.airline,
            departureTime: departureDateTime.toISOString(),
            arrivalTime: departureDateTime.toISOString(), // Same as departure for now
            price: values.basePrice,
            origin: booking.origin,
            destination: booking.destination
          },
          additionalFee: values.additionalFee,
          airportTax: values.airportTax,
          passengerIds: showPassengerSelection ? selectedPassengers : undefined,
          reason: values.reason || "Passenger requested reschedule"
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reschedule booking")
      }

      const result = await response.json()
      toast.success(result.message || "Booking rescheduled successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error rescheduling booking:", error)
      toast.error(error.message || "Failed to reschedule booking")
    } finally {
      setSubmitting(false)
    }
  }

  const pricing = calculatePricing()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            {booking?.bookingRef && (
              <>Reschedule booking <strong>{booking.bookingRef}</strong></>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading booking details...
          </div>
        ) : booking ? (
          <>
            <div className="space-y-4">
              {/* Current Flight Info */}
              <div className="rounded-lg border p-4 space-y-2 bg-gray-50">
                <div className="text-sm font-medium text-gray-600">Current Flight</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{booking.flightNumber}</span>
                  </div>
                  <Badge variant="outline">{booking.airline}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">Booking ID:</span>
                  <span className="font-mono text-xs">{booking.id}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">Booking Ref:</span>
                  <span className="font-mono text-xs font-semibold">{booking.bookingRef}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {booking.origin} → {booking.destination}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(booking.departureDate), "PPP p")}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3" />
                  {booking.passengers?.length || 0} passenger(s)
                </div>
              </div>

              {/* Passenger Selection (for multi-passenger bookings) */}
              {showPassengerSelection && booking.passengers && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Select Passengers to Reschedule</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedPassengers.length === booking.passengers.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {booking.passengers.map((passenger: any) => (
                      <div key={passenger.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={passenger.id}
                          checked={selectedPassengers.includes(passenger.id)}
                          onCheckedChange={() => handlePassengerToggle(passenger.id)}
                        />
                        <Label
                          htmlFor={passenger.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {passenger.customer?.title} {passenger.customer?.firstName} {passenger.customer?.lastName}
                          {passenger.customer?.nationality && ` (${passenger.customer.nationality})`}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedPassengers.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {selectedPassengers.length} of {booking.passengers.length} passenger(s) selected
                    </div>
                  )}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* New Flight Details */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Enter New Flight Details</div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="flightNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flight Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., TG456" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="airline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Airline</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Thai Airways" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="departureDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departure Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="basePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price (฿)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="0"
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Price per passenger</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additionalFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Fee (฿)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="500"
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Reschedule fee per passenger</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="airportTax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ภาษีสนามบิน / Airport Tax (฿)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="0"
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>Total airport tax for all passengers</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Reason for Reschedule */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Reschedule (Optional)</FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="e.g., Schedule conflict, Personal emergency"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pricing Details */}
                  {pricing && form.watch("basePrice") > 0 && (
                    <>
                      <div className="rounded-lg border p-4 space-y-3 bg-yellow-50">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <DollarSign className="h-4 w-4" />
                          Pricing Breakdown
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Original Flight Cost ({pricing.passengerCount} passenger{pricing.passengerCount > 1 ? 's' : ''})</span>
                            <span>฿{pricing.newFlightPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reschedule Fee</span>
                            <span className="text-orange-600">฿{pricing.rescheduleFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service Fee</span>
                            <span>฿{pricing.serviceFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ภาษีสนามบิน (Airport Tax)</span>
                            <span>฿{pricing.airportTax.toLocaleString()}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Total Amount</span>
                            <span className="text-lg">฿{pricing.total.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Per passenger</span>
                            <span>฿{pricing.perPassenger.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          The additional fee will be added to the new booking. Default is ฿500 per passenger.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || (showPassengerSelection && selectedPassengers.length === 0)}
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Reschedule
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}