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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, AlertCircle, Calendar, MapPin, Plane, Users, Route, DollarSign } from "lucide-react"
import { format } from "date-fns"

const reRouteSchema = z.object({
  flightNumber: z.string().min(1, "Please enter flight number"),
  airline: z.string().min(1, "Please enter airline"),
  origin: z.string().min(1, "Please select origin"),
  destination: z.string().min(1, "Please select destination"),
  departureDate: z.string().min(1, "Please enter departure date"),
  basePrice: z.number().min(0, "Please enter valid price"),
  additionalFee: z.number().min(0, "Re-route fee must be positive"),
  airportTax: z.number().min(0, "Airport tax must be positive"),
  passengerIds: z.array(z.string()).optional(),
  reason: z.string().optional()
})

type ReRouteFormValues = z.infer<typeof reRouteSchema>

interface ReRouteBookingDialogProps {
  bookingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const REROUTE_FEE_PER_PASSENGER = 800 // ฿800 per passenger (higher than reschedule)

export function ReRouteBookingDialog({
  bookingId,
  open,
  onOpenChange,
  onSuccess
}: ReRouteBookingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([])
  const [showPassengerSelection, setShowPassengerSelection] = useState(false)
  const [destinations, setDestinations] = useState<any[]>([])
  const [airlines, setAirlines] = useState<any[]>([])

  const form = useForm<ReRouteFormValues>({
    resolver: zodResolver(reRouteSchema),
    defaultValues: {
      flightNumber: "",
      airline: "",
      origin: "",
      destination: "",
      departureDate: "",
      basePrice: 0,
      additionalFee: 800, // Default re-route fee
      airportTax: 0,
      passengerIds: [],
      reason: ""
    },
  })

  useEffect(() => {
    if (open) {
      fetchMasterData()
    }
  }, [open])

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
      // Don't pre-fill origin/destination for re-route (user must select new route)
    }
  }, [booking, form])

  const fetchMasterData = async () => {
    try {
      const [destResponse, airlineResponse] = await Promise.all([
        fetch("/api/destinations"),
        fetch("/api/airlines")
      ])

      if (destResponse.ok) {
        const destData = await destResponse.json()
        setDestinations(destData)
      }

      if (airlineResponse.ok) {
        const airlineData = await airlineResponse.json()
        setAirlines(airlineData)
      }
    } catch (error) {
      console.error("Error fetching master data:", error)
    }
  }

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
    const newFlightPrice = basePrice * passengerCount
    const reRouteFee = additionalFee * passengerCount
    const serviceFee = (booking.totalServiceFee / booking.passengers.length) * passengerCount
    const total = newFlightPrice + reRouteFee + serviceFee + airportTax

    return {
      passengerCount,
      newFlightPrice,
      reRouteFee,
      serviceFee,
      airportTax,
      total,
      perPassenger: total / passengerCount
    }
  }

  const onSubmit = async (values: ReRouteFormValues) => {
    if (showPassengerSelection && selectedPassengers.length === 0) {
      toast.error("Please select at least one passenger to re-route")
      return
    }

    setSubmitting(true)
    try {
      // Use departure date with default time
      const departureDateTime = new Date(`${values.departureDate}T10:00:00`)

      const response = await fetch(`/api/bookings/${bookingId}/reroute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          newFlight: {
            flightNumber: values.flightNumber,
            airline: values.airline,
            origin: values.origin,
            destination: values.destination,
            departureTime: departureDateTime.toISOString(),
            arrivalTime: departureDateTime.toISOString(),
            price: values.basePrice,
          },
          additionalFee: values.additionalFee,
          airportTax: values.airportTax,
          passengerIds: showPassengerSelection ? selectedPassengers : undefined,
          reason: values.reason || "Route changed"
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to re-route booking")
      }

      const result = await response.json()
      toast.success(result.message || "Booking re-routed successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error re-routing booking:", error)
      toast.error(error.message || "Failed to re-route booking")
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
            <Route className="h-5 w-5" />
            Re-Route Booking
          </DialogTitle>
          <DialogDescription>
            {booking?.bookingRef && (
              <>Change route for booking <strong>{booking.bookingRef}</strong></>
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
                  <span className="font-semibold">{booking.origin} → {booking.destination}</span>
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
                    <Label className="text-sm font-medium">Select Passengers to Re-Route</Label>
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
                  {/* New Route Details */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Enter New Route Details</div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="origin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Origin*</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select origin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {destinations.map((dest) => (
                                  <SelectItem key={dest.id} value={`${dest.name} (${dest.code})`}>
                                    {dest.code} - {dest.name}, {dest.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="destination"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Destination*</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {destinations.map((dest) => (
                                  <SelectItem key={dest.id} value={`${dest.name} (${dest.code})`}>
                                    {dest.code} - {dest.name}, {dest.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                            <FormLabel>Re-Route Fee (฿)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="800"
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Fee per passenger for route change</FormDescription>
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

                  {/* Reason for Re-Route */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Re-Route (Optional)</FormLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="e.g., Destination changed, Customer request"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pricing Details */}
                  {pricing && form.watch("basePrice") > 0 && (
                    <>
                      <div className="rounded-lg border p-4 space-y-3 bg-orange-50">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <DollarSign className="h-4 w-4" />
                          Pricing Breakdown
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">New Flight ({pricing.passengerCount} passenger{pricing.passengerCount > 1 ? 's' : ''})</span>
                            <span>฿{pricing.newFlightPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Re-Route Fee</span>
                            <span className="text-orange-600">฿{pricing.reRouteFee.toLocaleString()}</span>
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
                          Re-routing changes the flight route. Default fee is ฿800 per passenger (higher than reschedule).
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
                      Confirm Re-Route
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