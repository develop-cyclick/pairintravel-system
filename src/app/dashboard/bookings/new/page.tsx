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
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Trash2, Building2, Plane, AlertCircle, Check, ChevronsUpDown, Calculator } from "lucide-react"
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

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
  // Manual flight info for individual passengers
  flightNumber?: string
  airline?: string
  origin?: string
  destination?: string
  departureTime?: string
  arrivalTime?: string
  price?: number
}

interface FlightInfo {
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  price: number
  availableSeats: number
}

export default function NewBookingPage() {
  const router = useRouter()
  const [bookingType, setBookingType] = useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL")
  const [useDifferentFlights, setUseDifferentFlights] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [approvalRef, setApprovalRef] = useState("")
  const [departments, setDepartments] = useState<any[]>([])
  const [passengers, setPassengers] = useState<PassengerData[]>([{
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationalId: "",
    passportNo: "",
    dateOfBirth: "",
    nationality: "Thai",
    flightNumber: "",
    airline: "",
    origin: "",
    destination: "",
    departureTime: "",
    arrivalTime: "",
    price: 0
  }])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Main flight info for all passengers (when not using different flights)
  const [mainFlight, setMainFlight] = useState<FlightInfo>({
    flightNumber: "",
    airline: "",
    origin: "",
    destination: "",
    departureTime: "",
    arrivalTime: "",
    price: 0,
    availableSeats: 100
  })
  
  // Cost and profit fields
  const [cost, setCost] = useState<number>(0)
  const [profit, setProfit] = useState<number>(0)
  
  // Department selection
  const [departmentOpen, setDepartmentOpen] = useState(false)
  const [departmentValue, setDepartmentValue] = useState("")
  const [departmentSearch, setDepartmentSearch] = useState("")
  const [showNewDepartmentDialog, setShowNewDepartmentDialog] = useState(false)
  const [newDepartment, setNewDepartment] = useState({
    code: "",
    nameEn: "",
    nameTh: "",
    ministry: "",
    address: "",
    phone: "",
    email: "",
    contactPerson: "",
    budget: ""
  })

  useEffect(() => {
    // Fetch departments
    fetch("/api/departments?isActive=true", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json()
        return []
      })
      .then(data => setDepartments(data || []))
      .catch(err => {
        console.error("Failed to fetch departments:", err)
        setDepartments([])
      })
  }, [])

  const addPassenger = () => {
    setPassengers([...passengers, {
      title: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      nationalId: "",
      passportNo: "",
      dateOfBirth: "",
      nationality: "Thai",
      flightNumber: "",
      airline: "",
      origin: "",
      destination: "",
      departureTime: "",
      arrivalTime: "",
      price: 0
    }])
  }

  const removePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index))
  }

  const updatePassenger = (index: number, field: keyof PassengerData, value: any) => {
    const updated = [...passengers]
    updated[index] = { ...updated[index], [field]: value }
    setPassengers(updated)
  }

  const updateMainFlight = (field: keyof FlightInfo, value: any) => {
    setMainFlight({ ...mainFlight, [field]: value })
  }

  const calculateTotalPrice = () => {
    if (bookingType === "GROUP" && useDifferentFlights) {
      return passengers.reduce((total, passenger) => {
        return total + (passenger.price || 0)
      }, 0)
    } else {
      return mainFlight.price * passengers.length
    }
  }

  const calculateProfit = () => {
    const total = calculateTotalPrice()
    return total - cost
  }

  const handleCreateDepartment = async () => {
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newDepartment,
          budget: newDepartment.budget ? parseFloat(newDepartment.budget) : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create department")
      }

      const data = await response.json()
      await fetch("/api/departments?isActive=true", { credentials: "include" })
        .then(res => res.json())
        .then(data => setDepartments(data || []))
      
      setDepartmentValue(data.department.id)
      setShowNewDepartmentDialog(false)
      setNewDepartment({
        code: "",
        nameEn: "",
        nameTh: "",
        ministry: "",
        address: "",
        phone: "",
        email: "",
        contactPerson: "",
        budget: ""
      })
      toast.success("Department created successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to create department")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validate flight information
      if (!useDifferentFlights || bookingType === "INDIVIDUAL") {
        if (!mainFlight.flightNumber || !mainFlight.airline || !mainFlight.origin || 
            !mainFlight.destination || !mainFlight.departureTime || !mainFlight.arrivalTime) {
          throw new Error("Please fill in all flight information")
        }
      } else {
        const missingFlightInfo = passengers.some(p => 
          !p.flightNumber || !p.airline || !p.origin || !p.destination || 
          !p.departureTime || !p.arrivalTime || !p.price
        )
        if (missingFlightInfo) {
          throw new Error("Please fill in all flight information for each passenger")
        }
      }

      // Create or find flight(s)
      let flightId: string | undefined
      const flightIds: Map<string, string> = new Map()

      if (!useDifferentFlights || bookingType === "INDIVIDUAL") {
        // Create or find the main flight
        const flightResponse = await fetch("/api/flights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...mainFlight,
            departureTime: new Date(mainFlight.departureTime).toISOString(),
            arrivalTime: new Date(mainFlight.arrivalTime).toISOString(),
            totalSeats: mainFlight.availableSeats,
            status: "SCHEDULED"
          })
        })

        if (!flightResponse.ok) {
          const errorData = await flightResponse.json()
          throw new Error(errorData.error || "Failed to create flight")
        }

        const flightData = await flightResponse.json()
        flightId = flightData.id
      } else {
        // Create or find individual flights for each passenger
        for (const passenger of passengers) {
          const flightKey = `${passenger.flightNumber}-${passenger.departureTime}`
          
          if (!flightIds.has(flightKey)) {
            const flightResponse = await fetch("/api/flights", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                flightNumber: passenger.flightNumber,
                airline: passenger.airline,
                origin: passenger.origin,
                destination: passenger.destination,
                departureTime: new Date(passenger.departureTime!).toISOString(),
                arrivalTime: new Date(passenger.arrivalTime!).toISOString(),
                price: passenger.price,
                availableSeats: 100,
                totalSeats: 100,
                status: "SCHEDULED"
              })
            })

            if (!flightResponse.ok) {
              const errorData = await flightResponse.json()
              throw new Error(errorData.error || "Failed to create flight")
            }

            const flightData = await flightResponse.json()
            flightIds.set(flightKey, flightData.id)
          }
        }
      }

      // Create booking
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: bookingType,
          flightId: flightId,
          useDifferentFlights: bookingType === "GROUP" && useDifferentFlights,
          departmentId: departmentValue || undefined,
          purpose: purpose || undefined,
          approvalRef: approvalRef || undefined,
          cost: cost || undefined,
          profit: profit || undefined,
          passengers: passengers.map(p => ({
            title: p.title,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone,
            nationalId: p.nationalId,
            passportNo: p.passportNo,
            dateOfBirth: p.dateOfBirth,
            nationality: p.nationality,
            flightId: (bookingType === "GROUP" && useDifferentFlights) 
              ? flightIds.get(`${p.flightNumber}-${p.departureTime}`) 
              : undefined
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create booking")
      }

      const booking = await response.json()
      toast.success("Booking created successfully!")
      router.push(`/dashboard/bookings`)
    } catch (error: any) {
      setError(error.message || "Failed to create booking. Please try again.")
      toast.error(error.message || "Failed to create booking")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New Booking</h2>
        <p className="text-muted-foreground">
          Create a new flight booking for individual or group passengers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Type</CardTitle>
            <CardDescription>
              Select whether this is an individual or group booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={bookingType} onValueChange={(v) => {
              setBookingType(v as "INDIVIDUAL" | "GROUP")
              setUseDifferentFlights(false)
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="INDIVIDUAL">Individual</TabsTrigger>
                <TabsTrigger value="GROUP">Group</TabsTrigger>
              </TabsList>
              <TabsContent value="INDIVIDUAL">
                <p className="text-sm text-muted-foreground">
                  Book a flight for a single passenger
                </p>
              </TabsContent>
              <TabsContent value="GROUP">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Book flights for multiple passengers (2-50 people)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="different-flights"
                      checked={useDifferentFlights}
                      onCheckedChange={setUseDifferentFlights}
                    />
                    <Label htmlFor="different-flights">
                      Allow passengers to take different flights
                    </Label>
                  </div>
                  {useDifferentFlights && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Each passenger can have their own flight details. This is useful for return trips or when passengers need to travel on different dates.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {(!useDifferentFlights || bookingType === "INDIVIDUAL") && (
          <Card>
            <CardHeader>
              <CardTitle>Flight Information</CardTitle>
              <CardDescription>
                Enter the flight details for {bookingType === "GROUP" ? "all passengers in" : ""} this booking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flightNumber">Flight Number</Label>
                  <Input
                    id="flightNumber"
                    value={mainFlight.flightNumber}
                    onChange={(e) => updateMainFlight("flightNumber", e.target.value)}
                    placeholder="e.g., TG110"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="airline">Airline</Label>
                  <Input
                    id="airline"
                    value={mainFlight.airline}
                    onChange={(e) => updateMainFlight("airline", e.target.value)}
                    placeholder="e.g., Thai Airways"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="origin">Origin</Label>
                  <Input
                    id="origin"
                    value={mainFlight.origin}
                    onChange={(e) => updateMainFlight("origin", e.target.value)}
                    placeholder="e.g., Bangkok (BKK)"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={mainFlight.destination}
                    onChange={(e) => updateMainFlight("destination", e.target.value)}
                    placeholder="e.g., Chiang Mai (CNX)"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="departureTime">Departure Date & Time</Label>
                  <Input
                    id="departureTime"
                    type="datetime-local"
                    value={mainFlight.departureTime}
                    onChange={(e) => updateMainFlight("departureTime", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalTime">Arrival Date & Time</Label>
                  <Input
                    id="arrivalTime"
                    type="datetime-local"
                    value={mainFlight.arrivalTime}
                    onChange={(e) => updateMainFlight("arrivalTime", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price per Passenger (฿)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={mainFlight.price}
                    onChange={(e) => updateMainFlight("price", parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="availableSeats">Available Seats</Label>
                  <Input
                    id="availableSeats"
                    type="number"
                    min="1"
                    value={mainFlight.availableSeats}
                    onChange={(e) => updateMainFlight("availableSeats", parseInt(e.target.value) || 100)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Government Department</CardTitle>
            <CardDescription>
              Search and select the department making this booking, or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={departmentOpen}
                      className="w-full justify-between"
                    >
                      {departmentValue
                        ? departments.find((dept) => dept.id === departmentValue)?.nameEn || "Select department..."
                        : "Select department (optional)"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search department..." 
                        value={departmentSearch}
                        onValueChange={setDepartmentSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No department found.</p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setDepartmentOpen(false)
                                setShowNewDepartmentDialog(true)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Department
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setDepartmentValue("")
                              setDepartmentOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                departmentValue === "" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            None (Personal Booking)
                          </CommandItem>
                          {departments.map((dept) => (
                            <CommandItem
                              key={dept.id}
                              value={dept.nameEn}
                              onSelect={() => {
                                setDepartmentValue(dept.id)
                                setDepartmentOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  departmentValue === dept.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>{dept.code} - {dept.nameEn}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {departmentValue && (
                <>
                  <div>
                    <Label htmlFor="purpose">Purpose of Travel</Label>
                    <Textarea
                      id="purpose"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Enter the purpose of this government travel"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="approvalRef">Approval Reference</Label>
                    <Input
                      id="approvalRef"
                      value={approvalRef}
                      onChange={(e) => setApprovalRef(e.target.value)}
                      placeholder="Enter approval document reference number"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost & Profit</CardTitle>
            <CardDescription>
              Enter the cost and calculate profit for this booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost (฿)</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => {
                    const newCost = parseFloat(e.target.value) || 0
                    setCost(newCost)
                    setProfit(calculateTotalPrice() - newCost)
                  }}
                  placeholder="Enter the cost of this booking"
                />
              </div>
              <div>
                <Label htmlFor="profit">Profit (฿)</Label>
                <div className="flex gap-2">
                  <Input
                    id="profit"
                    type="number"
                    step="0.01"
                    value={profit}
                    onChange={(e) => setProfit(parseFloat(e.target.value) || 0)}
                    placeholder="Calculated automatically"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setProfit(calculateProfit())}
                    title="Calculate profit"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-calculated: Total ({calculateTotalPrice().toLocaleString()}) - Cost ({cost.toLocaleString()}) = {calculateProfit().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passenger Information</CardTitle>
            <CardDescription>
              Enter details for {bookingType === "GROUP" ? "all passengers" : "the passenger"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {passengers.map((passenger, index) => (
              <div key={index} className="space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Passenger {index + 1}
                  </h4>
                  {bookingType === "GROUP" && passengers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePassenger(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {bookingType === "GROUP" && useDifferentFlights && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h5 className="font-medium text-sm">Flight Information for Passenger {index + 1}</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Flight Number</Label>
                        <Input
                          value={passenger.flightNumber}
                          onChange={(e) => updatePassenger(index, "flightNumber", e.target.value)}
                          placeholder="e.g., TG110"
                          required
                        />
                      </div>
                      <div>
                        <Label>Airline</Label>
                        <Input
                          value={passenger.airline}
                          onChange={(e) => updatePassenger(index, "airline", e.target.value)}
                          placeholder="e.g., Thai Airways"
                          required
                        />
                      </div>
                      <div>
                        <Label>Origin</Label>
                        <Input
                          value={passenger.origin}
                          onChange={(e) => updatePassenger(index, "origin", e.target.value)}
                          placeholder="e.g., Bangkok (BKK)"
                          required
                        />
                      </div>
                      <div>
                        <Label>Destination</Label>
                        <Input
                          value={passenger.destination}
                          onChange={(e) => updatePassenger(index, "destination", e.target.value)}
                          placeholder="e.g., Chiang Mai (CNX)"
                          required
                        />
                      </div>
                      <div>
                        <Label>Departure Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={passenger.departureTime}
                          onChange={(e) => updatePassenger(index, "departureTime", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Arrival Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={passenger.arrivalTime}
                          onChange={(e) => updatePassenger(index, "arrivalTime", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Price (฿)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={passenger.price}
                          onChange={(e) => updatePassenger(index, "price", parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Select
                      value={passenger.title}
                      onValueChange={(v) => updatePassenger(index, "title", v)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select title" />
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
                    <Label>Nationality</Label>
                    <Select
                      value={passenger.nationality}
                      onValueChange={(v) => updatePassenger(index, "nationality", v)}
                      required
                    >
                      <SelectTrigger>
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
                    <Label>First Name</Label>
                    <Input
                      value={passenger.firstName}
                      onChange={(e) => updatePassenger(index, "firstName", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={passenger.lastName}
                      onChange={(e) => updatePassenger(index, "lastName", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={passenger.email}
                      onChange={(e) => updatePassenger(index, "email", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={passenger.phone}
                      onChange={(e) => updatePassenger(index, "phone", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={passenger.dateOfBirth}
                      onChange={(e) => updatePassenger(index, "dateOfBirth", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label>{passenger.nationality === "Thai" ? "National ID" : "Passport Number"}</Label>
                    <Input
                      value={passenger.nationality === "Thai" ? passenger.nationalId : passenger.passportNo}
                      onChange={(e) => updatePassenger(index, passenger.nationality === "Thai" ? "nationalId" : "passportNo", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            {bookingType === "GROUP" && passengers.length < 50 && (
              <Button
                type="button"
                variant="outline"
                onClick={addPassenger}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Passenger
              </Button>
            )}
          </CardContent>
        </Card>

        {passengers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Passengers:</span>
                  <span className="font-semibold">{passengers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold text-lg">฿{calculateTotalPrice().toLocaleString()}</span>
                </div>
                {cost > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Cost:</span>
                      <span className="font-semibold">฿{cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit:</span>
                      <span className="font-semibold text-green-600">฿{profit.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {bookingType === "GROUP" && useDifferentFlights && (
                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium">Flight breakdown:</p>
                    {passengers.map((p, i) => p.flightNumber && (
                      <p key={i} className="text-sm text-muted-foreground">
                        Passenger {i + 1}: {p.flightNumber} - {p.origin} to {p.destination} (฿{p.price?.toLocaleString()})
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Booking...
              </>
            ) : (
              "Create Booking"
            )}
          </Button>
        </div>
      </form>

      <Dialog open={showNewDepartmentDialog} onOpenChange={setShowNewDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deptCode">Department Code</Label>
                <Input
                  id="deptCode"
                  value={newDepartment.code}
                  onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value })}
                  placeholder="e.g., MOF"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deptNameEn">Name (English)</Label>
                <Input
                  id="deptNameEn"
                  value={newDepartment.nameEn}
                  onChange={(e) => setNewDepartment({ ...newDepartment, nameEn: e.target.value })}
                  placeholder="e.g., Ministry of Finance"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deptNameTh">Name (Thai)</Label>
                <Input
                  id="deptNameTh"
                  value={newDepartment.nameTh}
                  onChange={(e) => setNewDepartment({ ...newDepartment, nameTh: e.target.value })}
                  placeholder="e.g., กระทรวงการคลัง"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ministry">Ministry</Label>
                <Input
                  id="ministry"
                  value={newDepartment.ministry}
                  onChange={(e) => setNewDepartment({ ...newDepartment, ministry: e.target.value })}
                  placeholder="Parent ministry"
                />
              </div>
              <div>
                <Label htmlFor="deptPhone">Phone</Label>
                <Input
                  id="deptPhone"
                  value={newDepartment.phone}
                  onChange={(e) => setNewDepartment({ ...newDepartment, phone: e.target.value })}
                  placeholder="e.g., 02-123-4567"
                />
              </div>
              <div>
                <Label htmlFor="deptEmail">Email</Label>
                <Input
                  id="deptEmail"
                  type="email"
                  value={newDepartment.email}
                  onChange={(e) => setNewDepartment({ ...newDepartment, email: e.target.value })}
                  placeholder="e.g., contact@mof.go.th"
                />
              </div>
              <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={newDepartment.contactPerson}
                  onChange={(e) => setNewDepartment({ ...newDepartment, contactPerson: e.target.value })}
                  placeholder="Main contact name"
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newDepartment.budget}
                  onChange={(e) => setNewDepartment({ ...newDepartment, budget: e.target.value })}
                  placeholder="Annual budget"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newDepartment.address}
                  onChange={(e) => setNewDepartment({ ...newDepartment, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewDepartmentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateDepartment}
              disabled={!newDepartment.code || !newDepartment.nameEn || !newDepartment.nameTh}
            >
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}