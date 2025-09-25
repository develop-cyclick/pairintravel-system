"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2, Plus, Trash2, Building2, User, AlertCircle, 
  Calculator, Plane, MapPin, Users, Calendar, DollarSign,
  Package, Clock, Search, History, ChevronDown, ChevronUp, UserSearch,
  CreditCard, Info
} from "lucide-react"
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { PassengerSearchDialog } from "@/components/purchase-order/passenger-search-dialog"
import { CreateDepartmentDialog } from "@/components/purchase-order/create-department-dialog"

const MAX_PASSENGERS_PER_BOOKING = 9

interface PassengerData {
  title: string
  firstName: string
  lastName: string
  email: string
  phone: string
  nationalId?: string
  passportNo?: string
  dateOfBirth: string
  nationality: string
}

interface CreditCardData {
  id: string
  cardNumber: string
  cardName: string
  cardType: "VISA" | "MASTERCARD" | "AMEX" | "OTHER"
  expiryDate: string
  cvv?: string
  creditLimit?: number
  availableCredit?: number
}

interface BookingData {
  id: string
  tripType: "ONE_WAY" | "ROUND_TRIP"
  bookingRef: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureDate: string
  arrivalDate: string
  basePrice: number
  totalCost: number
  totalServiceFee: number
  // Payment information
  paymentCardId?: string
  paymentCardNumber?: string
  // Return flight information for round trips
  returnBookingRef?: string
  returnFlightNumber?: string
  returnDepartureDate?: string
  returnArrivalDate?: string
  returnBasePrice?: number
  returnTotalCost?: number
  returnServiceFee?: number
  // Return flight payment (can be different card)
  returnPaymentCardId?: string
  returnPaymentCardNumber?: string
  passengers: PassengerData[]
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [poType, setPOType] = useState<"FLIGHT" | "TOUR">("FLIGHT")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Customer/Department selection
  const [entityType, setEntityType] = useState<"department" | "customer">("department")
  const [entityOpen, setEntityOpen] = useState(false)
  const [entitySearch, setEntitySearch] = useState("")
  const [entityHistory, setEntityHistory] = useState<any[]>([])
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Credit cards management
  const [availableCreditCards, setAvailableCreditCards] = useState<CreditCardData[]>([])
  const [isLoadingCards, setIsLoadingCards] = useState(false)

  // Multiple bookings
  const [bookings, setBookings] = useState<BookingData[]>([{
    id: `booking-${Date.now()}`,
    tripType: "ONE_WAY",
    bookingRef: "",
    flightNumber: "",
    airline: "",
    origin: "",
    destination: "",
    departureDate: "",
    arrivalDate: "",
    basePrice: 0,
    totalCost: 0,
    totalServiceFee: 0,
    paymentCardId: "",
    paymentCardNumber: "",
    returnBookingRef: "",
    returnFlightNumber: "",
    returnDepartureDate: "",
    returnArrivalDate: "",
    returnBasePrice: 0,
    returnTotalCost: 0,
    returnServiceFee: 0,
    returnPaymentCardId: "",
    returnPaymentCardNumber: "",
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
  }])

  // PO level fields
  const [tourPackageName, setTourPackageName] = useState("")

  // Collapsible states for bookings
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set([bookings[0].id]))
  
  // Passenger search dialog state
  const [showPassengerSearch, setShowPassengerSearch] = useState(false)
  const [searchTargetBooking, setSearchTargetBooking] = useState<string | null>(null)
  const [searchTargetPassengerIndex, setSearchTargetPassengerIndex] = useState<number | null>(null)
  const [showCreateDepartment, setShowCreateDepartment] = useState(false)

  // Load customer/department history
  useEffect(() => {
    loadEntityHistory()
  }, [entityType, entitySearch])

  // Load credit cards on mount
  useEffect(() => {
    loadCreditCards()
  }, [])

  const loadEntityHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/customers/history?type=${entityType}&search=${entitySearch}`, {
        credentials: "include"
      })
      if (response.ok) {
        const data = await response.json()
        setEntityHistory(data.results || [])
      }
    } catch (error) {
      console.error("Failed to load history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadCreditCards = async () => {
    setIsLoadingCards(true)
    try {
      const response = await fetch('/api/credit-cards?active=true', {
        credentials: "include"
      })
      if (response.ok) {
        const cards = await response.json()
        setAvailableCreditCards(cards.map((card: any) => ({
          id: card.id,
          cardNumber: card.cardNumber,
          cardName: card.cardName,
          cardType: card.cardType,
          expiryDate: `${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`,
          creditLimit: card.creditLimit,
          availableCredit: card.availableCredit
        })))
      }
    } catch (error) {
      console.error("Failed to load credit cards:", error)
      toast.error("Failed to load credit cards")
    } finally {
      setIsLoadingCards(false)
    }
  }

  const addBooking = () => {
    const newBooking: BookingData = {
      id: `booking-${Date.now()}`,
      tripType: "ONE_WAY",
      bookingRef: "",
      flightNumber: "",
      airline: "",
      origin: "",
      destination: "",
      departureDate: "",
      arrivalDate: "",
      basePrice: 0,
      totalCost: 0,
      totalServiceFee: 0,
      paymentCardId: "",
      paymentCardNumber: "",
      returnBookingRef: "",
      returnFlightNumber: "",
      returnDepartureDate: "",
      returnArrivalDate: "",
      returnBasePrice: 0,
      returnTotalCost: 0,
      returnServiceFee: 0,
      returnPaymentCardId: "",
      returnPaymentCardNumber: "",
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
    setBookings([...bookings, newBooking])
    setExpandedBookings(new Set([...expandedBookings, newBooking.id]))
  }

  const removeBooking = (bookingId: string) => {
    if (bookings.length > 1) {
      setBookings(bookings.filter(b => b.id !== bookingId))
      const newExpanded = new Set(expandedBookings)
      newExpanded.delete(bookingId)
      setExpandedBookings(newExpanded)
    }
  }

  const updateBooking = (bookingId: string, field: keyof BookingData, value: any) => {
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, [field]: value } : b
    ))
  }

  const addPassengerToBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking && booking.passengers.length < MAX_PASSENGERS_PER_BOOKING) {
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
    } else if (booking && booking.passengers.length >= MAX_PASSENGERS_PER_BOOKING) {
      toast.error(`Maximum ${MAX_PASSENGERS_PER_BOOKING} passengers per booking. Please create a new booking.`)
    }
  }

  const removePassengerFromBooking = (bookingId: string, passengerIndex: number) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking && booking.passengers.length > 1) {
      const newPassengers = booking.passengers.filter((_, i) => i !== passengerIndex)
      updateBooking(bookingId, "passengers", newPassengers)
    }
  }

  const updatePassengerInBooking = (bookingId: string, passengerIndex: number, field: keyof PassengerData, value: any) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      const newPassengers = [...booking.passengers]
      newPassengers[passengerIndex] = { ...newPassengers[passengerIndex], [field]: value }
      updateBooking(bookingId, "passengers", newPassengers)
    }
  }

  const handlePassengerSelection = (passenger: PassengerData) => {
    if (searchTargetBooking && searchTargetPassengerIndex !== null) {
      const booking = bookings.find(b => b.id === searchTargetBooking)
      if (booking) {
        const newPassengers = [...booking.passengers]
        newPassengers[searchTargetPassengerIndex] = passenger
        updateBooking(searchTargetBooking, "passengers", newPassengers)
        toast.success(`Passenger ${passenger.firstName} ${passenger.lastName} added`)
      }
    }
    setShowPassengerSearch(false)
    setSearchTargetBooking(null)
    setSearchTargetPassengerIndex(null)
  }

  const openPassengerSearch = (bookingId: string, passengerIndex: number) => {
    setSearchTargetBooking(bookingId)
    setSearchTargetPassengerIndex(passengerIndex)
    setShowPassengerSearch(true)
  }

  const toggleBookingExpanded = (bookingId: string) => {
    const newExpanded = new Set(expandedBookings)
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId)
    } else {
      newExpanded.add(bookingId)
    }
    setExpandedBookings(newExpanded)
  }

  const calculateBookingTotals = (booking: BookingData) => {
    const passengerCount = booking.passengers.length
    
    // Calculate outbound flight totals
    const outboundTotalPrice = booking.basePrice * passengerCount
    const outboundCostPerPassenger = booking.totalCost / passengerCount
    const outboundServiceFeePerPassenger = booking.totalServiceFee / passengerCount
    const outboundProfit = outboundTotalPrice - booking.totalCost - booking.totalServiceFee
    
    // Calculate return flight totals if round trip
    let returnTotalPrice = 0
    let returnCostPerPassenger = 0
    let returnServiceFeePerPassenger = 0
    let returnProfit = 0
    
    if (booking.tripType === "ROUND_TRIP") {
      returnTotalPrice = (booking.returnBasePrice || 0) * passengerCount
      returnCostPerPassenger = (booking.returnTotalCost || 0) / passengerCount
      returnServiceFeePerPassenger = (booking.returnServiceFee || 0) / passengerCount
      returnProfit = returnTotalPrice - (booking.returnTotalCost || 0) - (booking.returnServiceFee || 0)
    }
    
    // Calculate combined totals
    const totalPrice = outboundTotalPrice + returnTotalPrice
    const costPerPassenger = outboundCostPerPassenger + returnCostPerPassenger
    const serviceFeePerPassenger = outboundServiceFeePerPassenger + returnServiceFeePerPassenger
    const profit = outboundProfit + returnProfit
    
    return {
      totalPrice,
      costPerPassenger,
      serviceFeePerPassenger,
      profit,
      // Also return individual flight totals for display
      outbound: {
        totalPrice: outboundTotalPrice,
        costPerPassenger: outboundCostPerPassenger,
        serviceFeePerPassenger: outboundServiceFeePerPassenger,
        profit: outboundProfit
      },
      return: booking.tripType === "ROUND_TRIP" ? {
        totalPrice: returnTotalPrice,
        costPerPassenger: returnCostPerPassenger,
        serviceFeePerPassenger: returnServiceFeePerPassenger,
        profit: returnProfit
      } : null
    }
  }

  const calculateGrandTotals = () => {
    let totalPassengers = 0
    let totalRevenue = 0
    let totalCost = 0
    let totalServiceFee = 0
    
    bookings.forEach(booking => {
      totalPassengers += booking.passengers.length
      totalRevenue += booking.basePrice * booking.passengers.length
      totalCost += booking.totalCost
      totalServiceFee += booking.totalServiceFee
    })
    
    return {
      totalBookings: bookings.length,
      totalPassengers,
      totalRevenue,
      totalCost,
      totalServiceFee,
      totalProfit: totalRevenue - totalCost - totalServiceFee
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validate required fields
      if (!selectedEntity && entityType === "department") {
        throw new Error("Please select a department")
      }

      // Validate all bookings
      for (const booking of bookings) {
        if (!booking.flightNumber || !booking.airline || !booking.origin || 
            !booking.destination || !booking.departureDate || !booking.arrivalDate) {
          throw new Error("Please fill in all flight information for all bookings")
        }

        const invalidPassenger = booking.passengers.find(p => 
          !p.title || !p.firstName || !p.lastName || !p.email || !p.phone || !p.dateOfBirth
        )
        if (invalidPassenger) {
          throw new Error("Please fill in all required passenger information")
        }
      }

      // Collect all unique credit card payments
      const paymentCards: { cardId: string; amount: number }[] = []
      const cardAmounts = new Map<string, number>()

      // Process all bookings to collect credit card payments
      bookings.forEach(booking => {
        const totals = calculateBookingTotals(booking)
        
        // Outbound flight payment
        if (booking.paymentCardId) {
          const currentAmount = cardAmounts.get(booking.paymentCardId) || 0
          cardAmounts.set(booking.paymentCardId, currentAmount + totals.outboundTotal)
        }
        
        // Return flight payment (for round trips)
        if (booking.tripType === "ROUND_TRIP" && booking.returnPaymentCardId) {
          const currentAmount = cardAmounts.get(booking.returnPaymentCardId) || 0
          cardAmounts.set(booking.returnPaymentCardId, currentAmount + totals.returnTotal)
        }
      })

      // Convert to array for API
      cardAmounts.forEach((amount, cardId) => {
        paymentCards.push({ cardId, amount })
      })

      const requestBody: any = {
        type: poType,
        tourPackageName: poType === "TOUR" ? tourPackageName : undefined,
        paymentCards: paymentCards.length > 0 ? paymentCards : undefined,
        bookings: bookings.map(booking => ({
          flightNumber: booking.flightNumber,
          airline: booking.airline,
          origin: booking.origin,
          destination: booking.destination,
          departureDate: booking.departureDate,
          arrivalDate: booking.arrivalDate,
          basePrice: parseFloat(booking.basePrice.toString()),
          totalCost: parseFloat(booking.totalCost.toString()),
          totalServiceFee: parseFloat(booking.totalServiceFee.toString()),
          passengers: booking.passengers
        }))
      }

      // Add entity information
      if (entityType === "department" && selectedEntity) {
        requestBody.departmentId = selectedEntity.id
      } else if (entityType === "customer" && selectedEntity) {
        requestBody.customerId = selectedEntity.id
      }

      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create purchase order")
      }

      const purchaseOrder = await response.json()
      toast.success(`Purchase Order ${purchaseOrder.poNumber} created successfully!`)
      
      // Show booking info
      const totals = calculateGrandTotals()
      toast.info(`Created ${totals.totalBookings} booking(s) for ${totals.totalPassengers} passenger(s)`)

      router.push("/dashboard/purchase-orders")
    } catch (error: any) {
      setError(error.message || "Failed to create purchase order")
      toast.error(error.message || "Failed to create purchase order")
    } finally {
      setIsLoading(false)
    }
  }

  const grandTotals = calculateGrandTotals()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New Purchase Order</h2>
        <p className="text-muted-foreground">
          Create a purchase order with multiple flight bookings (max {MAX_PASSENGERS_PER_BOOKING} passengers per booking)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Order Type</CardTitle>
            <CardDescription>
              Select the type of purchase order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={poType} onValueChange={(v) => setPOType(v as "FLIGHT" | "TOUR")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="FLIGHT" className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Flight Booking
                </TabsTrigger>
                <TabsTrigger value="TOUR" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Tour Package
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Customer/Department Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Search from history or create new customer/department
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={entityType === "department" ? "default" : "outline"}
                onClick={() => setEntityType("department")}
                size="sm"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Government Department
              </Button>
              <Button
                type="button"
                variant={entityType === "customer" ? "default" : "outline"}
                onClick={() => setEntityType("customer")}
                size="sm"
              >
                <User className="h-4 w-4 mr-2" />
                Individual Customer
              </Button>
            </div>

            <div>
              <Label>Select {entityType === "department" ? "Department" : "Customer"}</Label>
              <Popover open={entityOpen} onOpenChange={setEntityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={entityOpen}
                    className="w-full justify-between"
                  >
                    {selectedEntity ? (
                      <span className="flex items-center gap-2">
                        {entityType === "department" ? (
                          <>
                            <Building2 className="h-4 w-4" />
                            {selectedEntity.code} - {selectedEntity.name}
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4" />
                            {selectedEntity.name}
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Search from history or create new...
                      </span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder={`Search ${entityType}...`}
                      value={entitySearch}
                      onValueChange={setEntitySearch}
                    />
                    <CommandList>
                      {isLoadingHistory ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Loading...
                        </div>
                      ) : entityHistory.length === 0 ? (
                        <CommandEmpty>
                          <div className="p-2 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              No {entityType} found
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setEntityOpen(false)
                                if (entityType === "department") {
                                  router.push("/dashboard/departments")
                                } else {
                                  router.push("/dashboard/customers")
                                }
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create New {entityType === "department" ? "Department" : "Customer"}
                            </Button>
                          </div>
                        </CommandEmpty>
                      ) : (
                        <CommandGroup heading={`Recent ${entityType === "department" ? "Departments" : "Customers"}`}>
                          {entityHistory.map((entity) => (
                            <CommandItem
                              key={entity.id}
                              value={entity.name || entity.code}
                              onSelect={() => {
                                setSelectedEntity(entity)
                                setEntityOpen(false)
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {entity.type === "department" ? (
                                    <Building2 className="h-4 w-4" />
                                  ) : (
                                    <User className="h-4 w-4" />
                                  )}
                                  <div>
                                    <p className="font-medium">
                                      {entity.type === "department" ? 
                                        `${entity.code} - ${entity.name}` : 
                                        entity.name
                                      }
                                    </p>
                                    {entity.email && (
                                      <p className="text-xs text-muted-foreground">{entity.email}</p>
                                    )}
                                  </div>
                                </div>
                                {entity.usageCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {entity.usageCount} orders
                                  </Badge>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Display Department/Customer Info */}
            {selectedEntity && entityType === "department" && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Department Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name (Thai):</span>
                    <p className="font-medium">{selectedEntity.nameTh || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name (English):</span>
                    <p className="font-medium">{selectedEntity.nameEn || selectedEntity.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax ID:</span>
                    <p className="font-medium">{selectedEntity.taxId || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedEntity.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedEntity.email || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium">{selectedEntity.address || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {poType === "TOUR" && (
              <div>
                <Label htmlFor="tourPackageName">Tour Package Name</Label>
                <Input
                  id="tourPackageName"
                  value={tourPackageName}
                  onChange={(e) => setTourPackageName(e.target.value)}
                  placeholder="Enter tour package name"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multiple Bookings */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Flight Bookings</h3>
            <Button
              type="button"
              onClick={addBooking}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Booking
            </Button>
          </div>

          {bookings.map((booking, bookingIndex) => {
            const totals = calculateBookingTotals(booking)
            const isExpanded = expandedBookings.has(booking.id)

            return (
              <Collapsible key={booking.id} open={isExpanded}>
                <Card className={cn(
                  "border-2",
                  booking.passengers.length >= MAX_PASSENGERS_PER_BOOKING && "border-orange-300"
                )}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Plane className="h-5 w-5" />
                          Booking {bookingIndex + 1}
                          {booking.flightNumber && (
                            <Badge variant="outline">{booking.flightNumber}</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {booking.passengers.length} passenger{booking.passengers.length !== 1 ? "s" : ""}
                          {booking.passengers.length >= MAX_PASSENGERS_PER_BOOKING && (
                            <Badge variant="secondary" className="ml-2">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Max capacity
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBookingExpanded(booking.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      {bookings.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBooking(booking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {/* Flight Information */}
                      <div>
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          Flight Information
                        </h4>
                        
                        {/* Trip Type Selector */}
                        <div className="mb-4">
                          <Label>Trip Type</Label>
                          <div className="flex gap-2 mt-2">
                            <Button
                              type="button"
                              variant={booking.tripType === "ONE_WAY" ? "default" : "outline"}
                              onClick={() => updateBooking(booking.id, "tripType", "ONE_WAY")}
                              size="sm"
                            >
                              One Way
                            </Button>
                            <Button
                              type="button"
                              variant={booking.tripType === "ROUND_TRIP" ? "default" : "outline"}
                              onClick={() => updateBooking(booking.id, "tripType", "ROUND_TRIP")}
                              size="sm"
                            >
                              Round Trip
                            </Button>
                          </div>
                        </div>

                        {/* Outbound Flight */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium mb-3">Outbound Flight</h5>
                          <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Booking Reference*</Label>
                            <Input
                              value={booking.bookingRef}
                              onChange={(e) => updateBooking(booking.id, "bookingRef", e.target.value)}
                              placeholder="e.g., ABC123"
                              required
                            />
                          </div>
                          <div>
                            <Label>Flight Number*</Label>
                            <Input
                              value={booking.flightNumber}
                              onChange={(e) => updateBooking(booking.id, "flightNumber", e.target.value)}
                              placeholder="e.g., TG110"
                              required
                            />
                          </div>
                          <div>
                            <Label>Airline*</Label>
                            <Input
                              value={booking.airline}
                              onChange={(e) => updateBooking(booking.id, "airline", e.target.value)}
                              placeholder="e.g., Thai Airways"
                              required
                            />
                          </div>
                          <div>
                            <Label>Base Price per Passenger (฿)*</Label>
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
                            <Label>Origin</Label>
                            <Input
                              value={booking.origin}
                              onChange={(e) => updateBooking(booking.id, "origin", e.target.value)}
                              placeholder="e.g., Bangkok (BKK)"
                              required
                            />
                          </div>
                          <div>
                            <Label>Destination</Label>
                            <Input
                              value={booking.destination}
                              onChange={(e) => updateBooking(booking.id, "destination", e.target.value)}
                              placeholder="e.g., Chiang Mai (CNX)"
                              required
                            />
                          </div>
                          <div>
                            <Label>Departure Date</Label>
                            <Input
                              type="datetime-local"
                              value={booking.departureDate}
                              onChange={(e) => updateBooking(booking.id, "departureDate", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Arrival Date</Label>
                            <Input
                              type="datetime-local"
                              value={booking.arrivalDate}
                              onChange={(e) => updateBooking(booking.id, "arrivalDate", e.target.value)}
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
                              placeholder="Total cost for this booking"
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
                              placeholder="Total service fee"
                              required
                            />
                          </div>
                        </div>
                        
                        {/* Payment Card Selection for Outbound */}
                        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                          <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Payment Card for Outbound Flight
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Select Credit Card*</Label>
                              <Select
                                value={booking.paymentCardId}
                                onValueChange={(value) => {
                                  updateBooking(booking.id, "paymentCardId", value)
                                  const selectedCard = availableCreditCards.find(card => card.id === value)
                                  if (selectedCard) {
                                    updateBooking(booking.id, "paymentCardNumber", selectedCard.cardNumber)
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a credit card" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCreditCards.map((card) => (
                                    <SelectItem key={card.id} value={card.id}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{card.cardName} - {card.cardNumber}</span>
                                        <Badge variant={card.availableCredit > 100000 ? "default" : "destructive"} className="ml-2">
                                          ฿{card.availableCredit?.toLocaleString()}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Or Enter Card Number Manually</Label>
                              <Input
                                value={booking.paymentCardNumber}
                                onChange={(e) => {
                                  updateBooking(booking.id, "paymentCardNumber", e.target.value)
                                  updateBooking(booking.id, "paymentCardId", "")
                                }}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                              />
                            </div>
                          </div>
                          {booking.paymentCardId && (
                            <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-600" />
                                <span className="text-blue-800">
                                  Selected Card: {availableCreditCards.find(c => c.id === booking.paymentCardId)?.cardName} 
                                  {" - Available Credit: ฿"}
                                  {availableCreditCards.find(c => c.id === booking.paymentCardId)?.availableCredit?.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        </div>

                        {/* Return Flight - Only show for Round Trip */}
                        {booking.tripType === "ROUND_TRIP" && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium mb-3">Return Flight</h5>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label>Return Booking Reference*</Label>
                                <Input
                                  value={booking.returnBookingRef || ""}
                                  onChange={(e) => updateBooking(booking.id, "returnBookingRef", e.target.value)}
                                  placeholder="e.g., XYZ789"
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                              <div>
                                <Label>Return Flight Number*</Label>
                                <Input
                                  value={booking.returnFlightNumber || ""}
                                  onChange={(e) => updateBooking(booking.id, "returnFlightNumber", e.target.value)}
                                  placeholder="e.g., TG111"
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                              <div>
                                <Label>Return Base Price per Passenger (฿)*</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={booking.returnBasePrice || 0}
                                  onChange={(e) => updateBooking(booking.id, "returnBasePrice", parseFloat(e.target.value) || 0)}
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                              <div>
                                <Label>Return Departure Date</Label>
                                <Input
                                  type="datetime-local"
                                  value={booking.returnDepartureDate || ""}
                                  onChange={(e) => updateBooking(booking.id, "returnDepartureDate", e.target.value)}
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                              <div>
                                <Label>Return Arrival Date</Label>
                                <Input
                                  type="datetime-local"
                                  value={booking.returnArrivalDate || ""}
                                  onChange={(e) => updateBooking(booking.id, "returnArrivalDate", e.target.value)}
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                              <div>
                                <Label>Return Total Cost (฿)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={booking.returnTotalCost || 0}
                                  onChange={(e) => updateBooking(booking.id, "returnTotalCost", parseFloat(e.target.value) || 0)}
                                  placeholder="Total cost for return flight"
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                              <div>
                                <Label>Return Service Fee (฿)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={booking.returnServiceFee || 0}
                                  onChange={(e) => updateBooking(booking.id, "returnServiceFee", parseFloat(e.target.value) || 0)}
                                  placeholder="Service fee for return"
                                  required={booking.tripType === "ROUND_TRIP"}
                                />
                              </div>
                            </div>
                            
                            {/* Payment Card Selection for Return Flight */}
                            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Payment Card for Return Flight
                              </h5>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Select Credit Card*</Label>
                                  <Select
                                    value={booking.returnPaymentCardId}
                                    onValueChange={(value) => {
                                      updateBooking(booking.id, "returnPaymentCardId", value)
                                      const selectedCard = availableCreditCards.find(card => card.id === value)
                                      if (selectedCard) {
                                        updateBooking(booking.id, "returnPaymentCardNumber", selectedCard.cardNumber)
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a credit card (can be different)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="same">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">Same as Outbound</Badge>
                                        </div>
                                      </SelectItem>
                                      <Separator className="my-1" />
                                      {availableCreditCards.map((card) => (
                                        <SelectItem key={card.id} value={card.id}>
                                          <div className="flex items-center justify-between w-full">
                                            <span>{card.cardName} - {card.cardNumber}</span>
                                            <Badge variant={card.availableCredit > 100000 ? "default" : "destructive"} className="ml-2">
                                              ฿{card.availableCredit?.toLocaleString()}
                                            </Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Or Enter Card Number Manually</Label>
                                  <Input
                                    value={booking.returnPaymentCardId === "same" ? booking.paymentCardNumber : booking.returnPaymentCardNumber}
                                    onChange={(e) => {
                                      updateBooking(booking.id, "returnPaymentCardNumber", e.target.value)
                                      updateBooking(booking.id, "returnPaymentCardId", "")
                                    }}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    disabled={booking.returnPaymentCardId === "same"}
                                  />
                                </div>
                              </div>
                              {booking.returnPaymentCardId && booking.returnPaymentCardId !== "same" && (
                                <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                                  <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <span className="text-blue-800">
                                      Selected Card: {availableCreditCards.find(c => c.id === booking.returnPaymentCardId)?.cardName} 
                                      {" - Available Credit: ฿"}
                                      {availableCreditCards.find(c => c.id === booking.returnPaymentCardId)?.availableCredit?.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {booking.returnPaymentCardId === "same" && (
                                <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                                  <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-green-600" />
                                    <span className="text-green-800">
                                      Using same card as outbound flight: {booking.paymentCardNumber || "Not selected yet"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Auto-calculated values */}
                        {booking.passengers.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {/* Total Summary */}
                            <div className="p-4 bg-muted rounded-lg">
                              <h6 className="text-sm font-medium mb-2">
                                {booking.tripType === "ROUND_TRIP" ? "Total (Both Ways)" : "Total"}
                              </h6>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Revenue:</span>
                                  <p className="font-semibold">฿{totals.totalPrice.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Cost/Passenger:</span>
                                  <p className="font-semibold">฿{totals.costPerPassenger.toFixed(2)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Fee/Passenger:</span>
                                  <p className="font-semibold">฿{totals.serviceFeePerPassenger.toFixed(2)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Profit:</span>
                                  <p className="font-semibold text-green-600">฿{totals.profit.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Breakdown for Round Trip */}
                            {booking.tripType === "ROUND_TRIP" && totals.return && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 border rounded-lg">
                                  <h6 className="text-xs font-medium mb-2 text-muted-foreground">Outbound</h6>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span>Revenue:</span>
                                      <span className="font-medium">฿{totals.outbound.totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Profit:</span>
                                      <span className="font-medium text-green-600">฿{totals.outbound.profit.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 border rounded-lg">
                                  <h6 className="text-xs font-medium mb-2 text-muted-foreground">Return</h6>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span>Revenue:</span>
                                      <span className="font-medium">฿{totals.return.totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Profit:</span>
                                      <span className="font-medium text-green-600">฿{totals.return.profit.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Passengers */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Passengers ({booking.passengers.length}/{MAX_PASSENGERS_PER_BOOKING})
                          </h4>
                          {booking.passengers.length < MAX_PASSENGERS_PER_BOOKING && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addPassengerToBooking(booking.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Passenger
                            </Button>
                          )}
                        </div>

                        {booking.passengers.map((passenger, passengerIndex) => {
                          const costPerPassenger = booking.passengers.length > 0 ? booking.totalCost / booking.passengers.length : 0
                          const serviceFeePerPassenger = booking.passengers.length > 0 ? booking.totalServiceFee / booking.passengers.length : 0
                          const profitPerPassenger = booking.basePrice - costPerPassenger - serviceFeePerPassenger
                          
                          return (
                          <div key={passengerIndex} className="space-y-4 mb-4 p-4 border rounded-lg bg-gradient-to-r from-background to-muted/20">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <h5 className="font-medium text-sm">
                                  Passenger {passengerIndex + 1}
                                </h5>
                                {booking.basePrice > 0 && (
                                  <div className="flex items-center gap-4">
                                    <div className="flex gap-2 text-xs">
                                      <Badge variant="outline" className="font-mono">
                                        Base: ฿{booking.basePrice.toLocaleString()}
                                      </Badge>
                                      <Badge variant="secondary" className="font-mono">
                                        Cost: ฿{costPerPassenger.toFixed(0)}
                                      </Badge>
                                      <Badge variant={profitPerPassenger > 0 ? "default" : "destructive"} className="font-mono">
                                        Profit: ฿{profitPerPassenger.toFixed(0)}
                                      </Badge>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPassengerSearch(booking.id, passengerIndex)}
                                  title="Search from existing passengers"
                                >
                                  <UserSearch className="h-4 w-4" />
                                </Button>
                                {booking.passengers.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePassengerFromBooking(booking.id, passengerIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Title</Label>
                                <Select
                                  value={passenger.title}
                                  onValueChange={(v) => updatePassengerInBooking(booking.id, passengerIndex, "title", v)}
                                  required
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Title" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Mr">Mr</SelectItem>
                                    <SelectItem value="Ms">Ms</SelectItem>
                                    <SelectItem value="Mrs">Mrs</SelectItem>
                                    <SelectItem value="Dr">Dr</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs">First Name</Label>
                                <Input
                                  className="h-9"
                                  value={passenger.firstName}
                                  onChange={(e) => updatePassengerInBooking(booking.id, passengerIndex, "firstName", e.target.value)}
                                  required
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Last Name</Label>
                                <Input
                                  className="h-9"
                                  value={passenger.lastName}
                                  onChange={(e) => updatePassengerInBooking(booking.id, passengerIndex, "lastName", e.target.value)}
                                  required
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Nationality</Label>
                                <Select
                                  value={passenger.nationality}
                                  onValueChange={(v) => updatePassengerInBooking(booking.id, passengerIndex, "nationality", v)}
                                  required
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Thai">Thai</SelectItem>
                                    <SelectItem value="American">American</SelectItem>
                                    <SelectItem value="British">British</SelectItem>
                                    <SelectItem value="Chinese">Chinese</SelectItem>
                                    <SelectItem value="Japanese">Japanese</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs">Email</Label>
                                <Input
                                  className="h-9"
                                  type="email"
                                  value={passenger.email}
                                  onChange={(e) => updatePassengerInBooking(booking.id, passengerIndex, "email", e.target.value)}
                                  required
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Phone</Label>
                                <Input
                                  className="h-9"
                                  value={passenger.phone}
                                  onChange={(e) => updatePassengerInBooking(booking.id, passengerIndex, "phone", e.target.value)}
                                  required
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Date of Birth</Label>
                                <Input
                                  className="h-9"
                                  type="date"
                                  value={passenger.dateOfBirth}
                                  onChange={(e) => updatePassengerInBooking(booking.id, passengerIndex, "dateOfBirth", e.target.value)}
                                  required
                                />
                              </div>

                              <div>
                                <Label className="text-xs">
                                  {passenger.nationality === "Thai" ? "National ID" : "Passport Number"}
                                </Label>
                                <Input
                                  className="h-9"
                                  value={passenger.nationality === "Thai" ? passenger.nationalId : passenger.passportNo}
                                  onChange={(e) => updatePassengerInBooking(
                                    booking.id, 
                                    passengerIndex, 
                                    passenger.nationality === "Thai" ? "nationalId" : "passportNo", 
                                    e.target.value
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </Collapsible>
            )
          })}
        </div>

        {/* Grand Total Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Total Bookings:</span>
                <p className="text-2xl font-bold">{grandTotals.totalBookings}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Passengers:</span>
                <p className="text-2xl font-bold">{grandTotals.totalPassengers}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Revenue:</span>
                <p className="text-2xl font-bold">฿{grandTotals.totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Cost:</span>
                <p className="text-2xl font-bold">฿{grandTotals.totalCost.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Service Fee:</span>
                <p className="text-2xl font-bold">฿{grandTotals.totalServiceFee.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Profit:</span>
                <p className="text-2xl font-bold text-green-600">฿{grandTotals.totalProfit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Purchase Order...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Create Purchase Order
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Passenger Search Dialog */}
      <PassengerSearchDialog
        open={showPassengerSearch}
        onOpenChange={setShowPassengerSearch}
        onSelectPassenger={handlePassengerSelection}
        excludePassengerIds={bookings.flatMap(b => 
          b.passengers.map(p => p.id).filter(id => id)
        )}
      />
    </div>
  )
}