"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Calendar, MapPin, Users, Plane, CreditCard } from "lucide-react"
import { format } from "date-fns"

interface ViewBookingDialogProps {
  bookingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewBookingDialog({ bookingId, open, onOpenChange }: ViewBookingDialogProps) {
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bookingId && open) {
      fetchBookingDetails()
    }
  }, [bookingId, open])

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
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      CONFIRMED: "default",
      PENDING: "secondary",
      CANCELLED: "destructive",
      RESCHEDULED: "outline"
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            View complete booking information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : booking ? (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Booking Reference</p>
                <p className="text-2xl font-bold">{booking.bookingRef}</p>
              </div>
              <div className="text-right">
                {getStatusBadge(booking.status)}
                <Badge variant="outline" className="ml-2">{booking.type}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Plane className="h-4 w-4" />
                    Flight Information
                  </div>
                  <p className="font-semibold">{booking.flight?.flightNumber}</p>
                  <p className="text-sm">{booking.flight?.airline}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    Route
                  </div>
                  <p className="font-semibold">
                    {booking.flight?.origin} → {booking.flight?.destination}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Departure:</span>{" "}
                      {booking.flight?.departureTime && 
                        format(new Date(booking.flight.departureTime), "PPP p")}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Arrival:</span>{" "}
                      {booking.flight?.arrivalTime && 
                        format(new Date(booking.flight.arrivalTime), "PPP p")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {booking.department && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Building2 className="h-4 w-4" />
                      Department
                    </div>
                    <p className="font-semibold">{booking.department.name}</p>
                    <p className="text-sm text-muted-foreground">{booking.department.code}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Passengers ({booking.passengers?.length || 0})
                  </div>
                  <div className="space-y-1">
                    {booking.passengers?.map((passenger: any, index: number) => (
                      <p key={index} className="text-sm">
                        {passenger.customer.title} {passenger.customer.firstName} {passenger.customer.lastName}
                        {passenger.seatNumber && ` - Seat ${passenger.seatNumber}`}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </div>
                  <p className="text-2xl font-bold">฿{booking.totalAmount?.toLocaleString()}</p>
                  {booking.invoice && (
                    <p className="text-sm text-muted-foreground">
                      Invoice: {booking.invoice.invoiceNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>Created: {booking.createdAt && format(new Date(booking.createdAt), "PPP p")}</p>
              <p>Last updated: {booking.updatedAt && format(new Date(booking.updatedAt), "PPP p")}</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}