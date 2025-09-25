"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, Search, Plane, Calendar, Users, Clock, 
  AlertCircle, CalendarClock, Edit3, X, Check,
  AlertTriangle, Timer, CalendarX2
} from "lucide-react"
import { toast } from "sonner"
import { format, addDays, isWithinInterval, isBefore, differenceInHours } from "date-fns"

interface Flight {
  id: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  price: number
  availableSeats: number
  totalSeats: number
  status: string
  _count?: {
    bookings: number
  }
  bookings?: Array<{
    id: string
    user: {
      name: string
      email: string
    }
  }>
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({
    newDepartureTime: "",
    newArrivalTime: "",
    reason: ""
  })

  useEffect(() => {
    fetchFlights()
    const interval = setInterval(fetchFlights, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchFlights = async () => {
    try {
      const response = await fetch("/api/flights")
      if (response.ok) {
        const data = await response.json()
        setFlights(data)
      }
    } catch (error) {
      console.error("Error fetching flights:", error)
      toast.error("Failed to load flights")
    } finally {
      setLoading(false)
    }
  }

  const handleRescheduleFlight = async () => {
    if (!selectedFlight) return

    try {
      const response = await fetch(`/api/flights/${selectedFlight.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureTime: new Date(rescheduleData.newDepartureTime).toISOString(),
          arrivalTime: new Date(rescheduleData.newArrivalTime).toISOString(),
          status: "RESCHEDULED"
        })
      })

      if (!response.ok) throw new Error("Failed to reschedule flight")

      toast.success("Flight rescheduled successfully")
      setIsRescheduleDialogOpen(false)
      fetchFlights()
      setRescheduleData({ newDepartureTime: "", newArrivalTime: "", reason: "" })
    } catch (error) {
      toast.error("Failed to reschedule flight")
    }
  }

  const handleCancelFlight = async () => {
    if (!selectedFlight) return

    try {
      const response = await fetch(`/api/flights/${selectedFlight.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      })

      if (!response.ok) throw new Error("Failed to cancel flight")

      toast.success("Flight cancelled successfully")
      setIsCancelDialogOpen(false)
      fetchFlights()
    } catch (error) {
      toast.error("Failed to cancel flight")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      SCHEDULED: "default",
      DELAYED: "secondary",
      CANCELLED: "destructive",
      COMPLETED: "outline",
      RESCHEDULED: "secondary"
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  const getTimeToDepart = (departureTime: string) => {
    const hours = differenceInHours(new Date(departureTime), new Date())
    if (hours < 0) return "Departed"
    if (hours < 1) return "< 1 hour"
    if (hours < 24) return `${hours} hours`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  // Categorize flights
  const now = new Date()
  const tomorrow = addDays(now, 1)
  const nextWeek = addDays(now, 7)

  const expiringSoonFlights = flights.filter(f => {
    const departure = new Date(f.departureTime)
    return f.status === "SCHEDULED" && 
           isWithinInterval(departure, { start: now, end: tomorrow }) &&
           !isBefore(departure, now)
  })

  const upcomingFlights = flights.filter(f => {
    const departure = new Date(f.departureTime)
    return f.status === "SCHEDULED" && 
           isWithinInterval(departure, { start: tomorrow, end: nextWeek })
  })

  const rescheduledFlights = flights.filter(f => f.status === "RESCHEDULED")
  const cancelledFlights = flights.filter(f => f.status === "CANCELLED")

  const filteredFlights = flights.filter(flight =>
    flight.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flight.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flight.destination.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Flight Management</h2>
          <p className="text-muted-foreground">
            Manage flight schedules, rescheduling, and monitor expiring flights
          </p>
        </div>
      </div>

      {/* Alert for Critical Flights */}
      {expiringSoonFlights.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            {expiringSoonFlights.length} flight{expiringSoonFlights.length > 1 ? 's' : ''} departing within 24 hours
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Timer className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringSoonFlights.length}</div>
            <p className="text-xs text-muted-foreground">Within 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingFlights.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rescheduled</CardTitle>
            <CalendarX2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rescheduledFlights.length}</div>
            <p className="text-xs text-muted-foreground">Recently changed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
            <Plane className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flights.length}</div>
            <p className="text-xs text-muted-foreground">All statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flights by number, origin, or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Tabs for different flight categories */}
      <Tabs defaultValue="expiring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="expiring">
            Expiring Soon ({expiringSoonFlights.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingFlights.length})
          </TabsTrigger>
          <TabsTrigger value="rescheduled">
            Rescheduled ({rescheduledFlights.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Flights ({flights.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle>Flights Departing Soon</CardTitle>
              <CardDescription>
                Flights departing within the next 24 hours that may need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FlightTable 
                flights={expiringSoonFlights}
                onReschedule={(flight) => {
                  setSelectedFlight(flight)
                  setIsRescheduleDialogOpen(true)
                }}
                onCancel={(flight) => {
                  setSelectedFlight(flight)
                  setIsCancelDialogOpen(true)
                }}
                showTimeToDepart
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Flights</CardTitle>
              <CardDescription>
                Flights scheduled for the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FlightTable 
                flights={upcomingFlights}
                onReschedule={(flight) => {
                  setSelectedFlight(flight)
                  setIsRescheduleDialogOpen(true)
                }}
                onCancel={(flight) => {
                  setSelectedFlight(flight)
                  setIsCancelDialogOpen(true)
                }}
                showTimeToDepart
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rescheduled">
          <Card>
            <CardHeader>
              <CardTitle>Rescheduled Flights</CardTitle>
              <CardDescription>
                Flights that have been recently rescheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FlightTable 
                flights={rescheduledFlights}
                onReschedule={(flight) => {
                  setSelectedFlight(flight)
                  setIsRescheduleDialogOpen(true)
                }}
                onCancel={(flight) => {
                  setSelectedFlight(flight)
                  setIsCancelDialogOpen(true)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Flights</CardTitle>
              <CardDescription>
                Complete list of all flights in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FlightTable 
                flights={searchTerm ? filteredFlights : flights}
                onReschedule={(flight) => {
                  setSelectedFlight(flight)
                  setIsRescheduleDialogOpen(true)
                }}
                onCancel={(flight) => {
                  setSelectedFlight(flight)
                  setIsCancelDialogOpen(true)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Flight</DialogTitle>
            <DialogDescription>
              Reschedule flight {selectedFlight?.flightNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="newDepartureTime">New Departure Time</Label>
              <Input
                id="newDepartureTime"
                type="datetime-local"
                value={rescheduleData.newDepartureTime}
                onChange={(e) => setRescheduleData({...rescheduleData, newDepartureTime: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="newArrivalTime">New Arrival Time</Label>
              <Input
                id="newArrivalTime"
                type="datetime-local"
                value={rescheduleData.newArrivalTime}
                onChange={(e) => setRescheduleData({...rescheduleData, newArrivalTime: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason for Rescheduling</Label>
              <Input
                id="reason"
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                placeholder="Weather, maintenance, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleFlight}>
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Flight</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel flight {selectedFlight?.flightNumber}? 
              This will affect all bookings for this flight.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              No, Keep Flight
            </Button>
            <Button variant="destructive" onClick={handleCancelFlight}>
              Yes, Cancel Flight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Flight Table Component
function FlightTable({ 
  flights, 
  onReschedule, 
  onCancel,
  showTimeToDepart = false
}: {
  flights: Flight[]
  onReschedule: (flight: Flight) => void
  onCancel: (flight: Flight) => void
  showTimeToDepart?: boolean
}) {
  const getTimeToDepart = (departureTime: string) => {
    const hours = differenceInHours(new Date(departureTime), new Date())
    if (hours < 0) return "Departed"
    if (hours < 1) return "< 1 hour"
    if (hours < 24) return `${hours} hours`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      SCHEDULED: "default",
      DELAYED: "secondary",
      CANCELLED: "destructive",
      COMPLETED: "outline",
      RESCHEDULED: "secondary"
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  if (flights.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No flights found in this category</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Flight</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>Departure</TableHead>
          {showTimeToDepart && <TableHead>Time to Depart</TableHead>}
          <TableHead>Agent</TableHead>
          <TableHead>Bookings</TableHead>
          <TableHead>Seats</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flights.map((flight) => (
          <TableRow key={flight.id}>
            <TableCell>
              <div>
                <div className="font-medium">{flight.flightNumber}</div>
                <div className="text-xs text-muted-foreground">{flight.airline}</div>
              </div>
            </TableCell>
            <TableCell>
              {flight.origin} → {flight.destination}
            </TableCell>
            <TableCell>
              {format(new Date(flight.departureTime), "MMM dd, HH:mm")}
            </TableCell>
            {showTimeToDepart && (
              <TableCell>
                <Badge 
                  variant={
                    differenceInHours(new Date(flight.departureTime), new Date()) < 6 
                      ? "destructive" 
                      : "outline"
                  }
                >
                  {getTimeToDepart(flight.departureTime)}
                </Badge>
              </TableCell>
            )}
            <TableCell>
              <div className="text-sm">
                {flight.bookings && flight.bookings.length > 0 ? (
                  <div>
                    <div className="font-medium">{flight.bookings[0].user.name}</div>
                    {flight.bookings.length > 1 && (
                      <div className="text-xs text-muted-foreground">
                        +{flight.bookings.length - 1} more
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {flight._count?.bookings || 0}
            </TableCell>
            <TableCell>
              {flight.availableSeats}/{flight.totalSeats}
            </TableCell>
            <TableCell>{getStatusBadge(flight.status)}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReschedule(flight)}
                  disabled={flight.status === "CANCELLED" || flight.status === "COMPLETED"}
                >
                  <CalendarClock className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel(flight)}
                  disabled={flight.status === "CANCELLED" || flight.status === "COMPLETED"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}