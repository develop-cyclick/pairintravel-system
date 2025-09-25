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
import { toast } from "sonner"
import { Loader2, AlertCircle, Calendar, MapPin, Plane, CreditCard } from "lucide-react"
import { format } from "date-fns"

const rescheduleSchema = z.object({
  newFlightId: z.string().min(1, "Please select a new flight"),
})

type RescheduleFormValues = z.infer<typeof rescheduleSchema>

interface RescheduleBookingDialogProps {
  bookingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RescheduleBookingDialog({ 
  bookingId, 
  open, 
  onOpenChange, 
  onSuccess 
}: RescheduleBookingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [availableFlights, setAvailableFlights] = useState<any[]>([])
  const [selectedFlight, setSelectedFlight] = useState<any>(null)
  const [priceDifference, setPriceDifference] = useState(0)
  
  const form = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      newFlightId: "",
    },
  })

  useEffect(() => {
    if (bookingId && open) {
      fetchBookingDetails()
    }
  }, [bookingId, open])

  useEffect(() => {
    if (booking) {
      fetchAvailableFlights()
    }
  }, [booking])

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

  const fetchAvailableFlights = async () => {
    try {
      const response = await fetch(
        `/api/flights/search?origin=${booking.flight.origin}&destination=${booking.flight.destination}&excludeId=${booking.flight.id}`,
        { credentials: "include" }
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableFlights(data)
      }
    } catch (error) {
      console.error("Error fetching flights:", error)
    }
  }

  const handleFlightChange = (flightId: string) => {
    const flight = availableFlights.find(f => f.id === flightId)
    setSelectedFlight(flight)
    if (flight && booking) {
      const passengerCount = booking.passengers?.length || 1
      const oldTotal = booking.flight.price * passengerCount
      const newTotal = flight.price * passengerCount
      setPriceDifference(newTotal - oldTotal)
    }
  }

  const onSubmit = async (values: RescheduleFormValues) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          newFlightId: values.newFlightId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to reschedule booking")
      }

      toast.success("Booking rescheduled successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error rescheduling booking:", error)
      toast.error(error.message || "Failed to reschedule booking")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Select a new flight for booking {booking?.bookingRef}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : booking ? (
          <>
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="text-sm font-medium">Current Flight</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{booking.flight.flightNumber}</span>
                  </div>
                  <Badge variant="outline">{booking.flight.airline}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {booking.flight.origin} → {booking.flight.destination}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(booking.flight.departureTime), "PPP p")}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-3 w-3" />
                  ฿{booking.flight.price.toLocaleString()} per person
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="newFlightId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select New Flight</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleFlightChange(value)
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a flight" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableFlights.length === 0 ? (
                              <div className="py-2 px-3 text-sm text-muted-foreground">
                                No alternative flights available
                              </div>
                            ) : (
                              availableFlights.map((flight) => (
                                <SelectItem key={flight.id} value={flight.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <span className="font-medium">{flight.flightNumber}</span>
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {format(new Date(flight.departureTime), "MMM dd, HH:mm")}
                                      </span>
                                    </div>
                                    <span className="ml-4 text-sm">
                                      ฿{flight.price.toLocaleString()}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Available flights on the same route
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedFlight && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
                      <div className="text-sm font-medium">New Flight Details</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{selectedFlight.flightNumber}</span>
                        </div>
                        <Badge variant="outline">{selectedFlight.airline}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Departure: {format(new Date(selectedFlight.departureTime), "PPP p")}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Arrival: {format(new Date(selectedFlight.arrivalTime), "PPP p")}
                      </div>
                      <div className="text-sm">
                        Available seats: {selectedFlight.availableSeats}
                      </div>
                    </div>
                  )}

                  {priceDifference !== 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {priceDifference > 0 ? (
                          <span>
                            Additional payment required: <strong>฿{Math.abs(priceDifference).toLocaleString()}</strong>
                          </span>
                        ) : (
                          <span>
                            Refund amount: <strong>฿{Math.abs(priceDifference).toLocaleString()}</strong>
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
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
                    <Button type="submit" disabled={submitting || availableFlights.length === 0}>
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