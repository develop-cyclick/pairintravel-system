"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Package, MapPin, Calendar, Clock, Users, 
  ChevronDown, ChevronUp, Trash2, Plus,
  FileText, DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TourPackage {
  id: string
  tourId: string
  name: string
  description: string
  destination: string
  duration: number
  price: number
  maxCapacity: number
  includes: string[]
}

interface TourBookingData {
  id: string
  tourPackageId: string
  tourPackage?: TourPackage
  bookingRef: string
  tourProgramDetails: string
  departureDate: string
  returnDate: string
  pickupLocation: string
  pickupTime: string
  specialRequirements: string
  basePrice: number
  totalCost: number
  totalServiceFee: number
  passengers: PassengerData[]
}

interface PassengerData {
  title: string
  firstName: string
  lastName: string
  email: string
  phone: string
  nationalId: string
  passportNo: string
  dateOfBirth: string
  nationality: string
}

interface TourBookingFormProps {
  bookings: TourBookingData[]
  onBookingsChange: (bookings: TourBookingData[]) => void
  maxPassengersPerBooking?: number
}

const TOUR_PACKAGES: TourPackage[] = [
  {
    id: "tour-1",
    tourId: "CNX-001",
    name: "Chiang Mai Cultural Tour",
    description: "3 days exploring temples and local culture",
    destination: "Chiang Mai",
    duration: 3,
    price: 8500,
    maxCapacity: 20,
    includes: ["Hotel", "Breakfast", "Transport", "Guide"]
  },
  {
    id: "tour-2",
    tourId: "PKT-001",
    name: "Phuket Beach Paradise",
    description: "5 days island hopping and beach activities",
    destination: "Phuket",
    duration: 5,
    price: 15000,
    maxCapacity: 15,
    includes: ["Resort", "All Meals", "Boat Tours", "Snorkeling"]
  },
  {
    id: "tour-3",
    tourId: "KBI-001",
    name: "Krabi Adventure Tour",
    description: "4 days rock climbing and kayaking",
    destination: "Krabi",
    duration: 4,
    price: 12000,
    maxCapacity: 10,
    includes: ["Hotel", "Breakfast & Lunch", "Equipment", "Guide"]
  }
]

export function TourBookingForm({ 
  bookings, 
  onBookingsChange,
  maxPassengersPerBooking = 9 
}: TourBookingFormProps) {
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())

  const toggleBooking = (bookingId: string) => {
    const newExpanded = new Set(expandedBookings)
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId)
    } else {
      newExpanded.add(bookingId)
    }
    setExpandedBookings(newExpanded)
  }

  const addBooking = () => {
    const newBooking: TourBookingData = {
      id: `tour-booking-${Date.now()}`,
      tourPackageId: "",
      bookingRef: `TOUR-${Date.now().toString().slice(-8)}`,
      tourProgramDetails: "",
      departureDate: "",
      returnDate: "",
      pickupLocation: "",
      pickupTime: "",
      specialRequirements: "",
      basePrice: 0,
      totalCost: 0,
      totalServiceFee: 0,
      passengers: [{
        title: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        nationalId: "",
        passportNo: "",
        dateOfBirth: "",
        nationality: "Thai"
      }]
    }
    onBookingsChange([...bookings, newBooking])
    setExpandedBookings(new Set([...expandedBookings, newBooking.id]))
  }

  const removeBooking = (bookingId: string) => {
    onBookingsChange(bookings.filter(b => b.id !== bookingId))
  }

  const updateBooking = (bookingId: string, field: keyof TourBookingData, value: any) => {
    onBookingsChange(bookings.map(booking => {
      if (booking.id === bookingId) {
        const updated = { ...booking, [field]: value }
        
        // If tour package is selected, update the base price and details
        if (field === "tourPackageId" && value) {
          const selectedPackage = TOUR_PACKAGES.find(p => p.id === value)
          if (selectedPackage) {
            updated.tourPackage = selectedPackage
            updated.basePrice = selectedPackage.price
          }
        }
        
        return updated
      }
      return booking
    }))
  }

  const addPassenger = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking || booking.passengers.length >= maxPassengersPerBooking) return

    const newPassenger: PassengerData = {
      title: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      nationalId: "",
      passportNo: "",
      dateOfBirth: "",
      nationality: "Thai"
    }

    updateBooking(bookingId, "passengers", [...booking.passengers, newPassenger])
  }

  const removePassenger = (bookingId: string, passengerIndex: number) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking || booking.passengers.length <= 1) return

    updateBooking(
      bookingId, 
      "passengers", 
      booking.passengers.filter((_, i) => i !== passengerIndex)
    )
  }

  const updatePassenger = (
    bookingId: string, 
    passengerIndex: number, 
    field: keyof PassengerData, 
    value: string
  ) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    const updatedPassengers = booking.passengers.map((p, i) => 
      i === passengerIndex ? { ...p, [field]: value } : p
    )
    updateBooking(bookingId, "passengers", updatedPassengers)
  }

  const calculateBookingTotals = (booking: TourBookingData) => {
    const passengerCount = booking.passengers.length
    const totalPrice = booking.basePrice * passengerCount
    const profit = totalPrice - booking.totalCost - booking.totalServiceFee
    return {
      passengerCount,
      totalPrice,
      totalCost: booking.totalCost,
      totalServiceFee: booking.totalServiceFee,
      profit
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tour Package Bookings</h3>
        <Button
          type="button"
          onClick={addBooking}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tour Booking
        </Button>
      </div>

      {bookings.map((booking, bookingIndex) => {
        const totals = calculateBookingTotals(booking)
        const isExpanded = expandedBookings.has(booking.id)
        
        return (
          <Card key={booking.id} className={cn(
            "border-2",
            booking.passengers.length >= maxPassengersPerBooking && "border-orange-300"
          )}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Tour Booking #{bookingIndex + 1}
                    {booking.tourPackage && (
                      <Badge variant="secondary">{booking.tourPackage.name}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Booking Ref: {booking.bookingRef} • 
                    {totals.passengerCount} passenger(s) • 
                    Total: ฿{totals.totalPrice.toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBooking(booking.id)}
                    >
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                  </CollapsibleTrigger>
                  {bookings.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBooking(booking.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Tour Package Selection */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Tour Package Selection
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Select Tour Package*</Label>
                      <Select
                        value={booking.tourPackageId}
                        onValueChange={(value) => updateBooking(booking.id, "tourPackageId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a tour package" />
                        </SelectTrigger>
                        <SelectContent>
                          {TOUR_PACKAGES.map(pkg => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{pkg.name} - {pkg.destination}</span>
                                <Badge variant="outline" className="ml-2">
                                  ฿{pkg.price.toLocaleString()}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {booking.tourPackage && (
                      <div className="col-span-2 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">{booking.tourPackage.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            <MapPin className="h-3 w-3 mr-1" />
                            {booking.tourPackage.destination}
                          </Badge>
                          <Badge variant="secondary">
                            <Calendar className="h-3 w-3 mr-1" />
                            {booking.tourPackage.duration} days
                          </Badge>
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            Max {booking.tourPackage.maxCapacity} pax
                          </Badge>
                        </div>
                        {booking.tourPackage.includes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Includes:</p>
                            <div className="flex flex-wrap gap-1">
                              {booking.tourPackage.includes.map((item, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tour Program Details */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Tour Program Details
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Tour Program Details*</Label>
                      <Textarea
                        value={booking.tourProgramDetails}
                        onChange={(e) => updateBooking(booking.id, "tourProgramDetails", e.target.value)}
                        placeholder="Enter detailed itinerary, activities, and schedule for the tour..."
                        rows={6}
                        required
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Include day-by-day itinerary, meal arrangements, accommodation details, etc.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Departure Date*</Label>
                        <Input
                          type="datetime-local"
                          value={booking.departureDate}
                          onChange={(e) => updateBooking(booking.id, "departureDate", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Return Date*</Label>
                        <Input
                          type="datetime-local"
                          value={booking.returnDate}
                          onChange={(e) => updateBooking(booking.id, "returnDate", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Pickup Location*</Label>
                        <Input
                          value={booking.pickupLocation}
                          onChange={(e) => updateBooking(booking.id, "pickupLocation", e.target.value)}
                          placeholder="e.g., Hotel lobby, Airport, etc."
                          required
                        />
                      </div>
                      <div>
                        <Label>Pickup Time*</Label>
                        <Input
                          type="time"
                          value={booking.pickupTime}
                          onChange={(e) => updateBooking(booking.id, "pickupTime", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Special Requirements</Label>
                      <Textarea
                        value={booking.specialRequirements}
                        onChange={(e) => updateBooking(booking.id, "specialRequirements", e.target.value)}
                        placeholder="Any special dietary needs, accessibility requirements, or other requests..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Cost Information */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost Information
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Base Price per Person (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.basePrice}
                        onChange={(e) => updateBooking(booking.id, "basePrice", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Total Cost (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.totalCost}
                        onChange={(e) => updateBooking(booking.id, "totalCost", parseFloat(e.target.value) || 0)}
                        placeholder="Actual cost"
                        required
                      />
                    </div>
                    <div>
                      <Label>Total Service Fee (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={booking.totalServiceFee}
                        onChange={(e) => updateBooking(booking.id, "totalServiceFee", parseFloat(e.target.value) || 0)}
                        placeholder="Service charges"
                        required
                      />
                    </div>
                  </div>

                  {/* Auto-calculated values */}
                  {booking.passengers.length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Revenue:</span>
                          <p className="font-semibold">฿{totals.totalPrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost:</span>
                          <p className="font-semibold">฿{totals.totalCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Service Fee:</span>
                          <p className="font-semibold">฿{totals.totalServiceFee.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Profit:</span>
                          <p className="font-semibold text-green-600">฿{totals.profit.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Passengers */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Passengers ({booking.passengers.length}/{maxPassengersPerBooking})
                    </h4>
                    {booking.passengers.length < maxPassengersPerBooking && (
                      <Button
                        type="button"
                        onClick={() => addPassenger(booking.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Passenger
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {booking.passengers.map((passenger, passengerIndex) => (
                      <Card key={passengerIndex}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">
                              Passenger {passengerIndex + 1}
                            </CardTitle>
                            {booking.passengers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePassenger(booking.id, passengerIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <Label>Title*</Label>
                              <Select
                                value={passenger.title}
                                onValueChange={(value) => updatePassenger(booking.id, passengerIndex, "title", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Title" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mr">Mr</SelectItem>
                                  <SelectItem value="Mrs">Mrs</SelectItem>
                                  <SelectItem value="Ms">Ms</SelectItem>
                                  <SelectItem value="Dr">Dr</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>First Name*</Label>
                              <Input
                                value={passenger.firstName}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "firstName", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Last Name*</Label>
                              <Input
                                value={passenger.lastName}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "lastName", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Date of Birth*</Label>
                              <Input
                                type="date"
                                value={passenger.dateOfBirth}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "dateOfBirth", e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Email*</Label>
                              <Input
                                type="email"
                                value={passenger.email}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "email", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Phone*</Label>
                              <Input
                                value={passenger.phone}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "phone", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Nationality*</Label>
                              <Input
                                value={passenger.nationality}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "nationality", e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>National ID</Label>
                              <Input
                                value={passenger.nationalId}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "nationalId", e.target.value)}
                                placeholder="Thai ID number"
                              />
                            </div>
                            <div>
                              <Label>Passport No</Label>
                              <Input
                                value={passenger.passportNo}
                                onChange={(e) => updatePassenger(booking.id, passengerIndex, "passportNo", e.target.value)}
                                placeholder="For international travel"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        )
      })}
    </div>
  )
}