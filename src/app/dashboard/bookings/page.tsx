"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Eye, Edit, Calendar, Search, Building2, Filter } from "lucide-react"
import { toast } from "sonner"
import { ViewBookingDialog } from "@/components/bookings/ViewBookingDialog"
import { EditBookingDialog } from "@/components/bookings/EditBookingDialog"
import { RescheduleBookingDialog } from "@/components/bookings/RescheduleBookingDialog"

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
    fetchDepartments()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings", {
        credentials: "include"
      })
      if (!response.ok) {
        if (response.status === 401) {
          // User is not authenticated, redirect to login
          window.location.href = "/login"
          return
        }
        throw new Error("Failed to fetch bookings")
      }
      const data = await response.json()
      setBookings(data)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast.error("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments", {
        credentials: "include"
      })
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === "" || 
      booking.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.flight?.flightNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter
    const matchesType = typeFilter === "all" || booking.type === typeFilter
    const matchesDepartment = departmentFilter === "all" || 
      (departmentFilter === "none" && !booking.departmentId) ||
      booking.departmentId === departmentFilter

    return matchesSearch && matchesStatus && matchesType && matchesDepartment
  })

  const handleView = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setViewDialogOpen(true)
  }

  const handleEdit = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setEditDialogOpen(true)
  }

  const handleReschedule = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setRescheduleDialogOpen(true)
  }

  const handleUpdateSuccess = () => {
    fetchBookings()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            Manage flight bookings and reservations
          </p>
        </div>
        <Link href="/dashboard/bookings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            View and manage all flight bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="none">Personal Bookings</SelectItem>
                {departments.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      <span className="text-xs">{dept.code}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading bookings...</p>
          ) : filteredBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No bookings found. {bookings.length === 0 ? "Create your first booking to get started." : "Try adjusting your filters."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Flight</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Passengers</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.bookingRef}
                    </TableCell>
                    <TableCell>{booking.flight?.flightNumber}</TableCell>
                    <TableCell>
                      {booking.flight?.origin} → {booking.flight?.destination}
                    </TableCell>
                    <TableCell>
                      {booking.flight?.departureTime ? 
                        new Date(booking.flight.departureTime).toLocaleDateString() : 
                        "-"}
                    </TableCell>
                    <TableCell>
                      {booking.department ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span className="text-xs">{booking.department.code}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Personal</span>
                      )}
                    </TableCell>
                    <TableCell>{booking.passengers?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>฿{booking.totalAmount?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(booking.id)}
                          title="View booking details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(booking.id)}
                          title="Edit booking"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleReschedule(booking.id)}
                          title="Reschedule booking"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ViewBookingDialog
        bookingId={selectedBookingId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <EditBookingDialog
        bookingId={selectedBookingId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleUpdateSuccess}
      />

      <RescheduleBookingDialog
        bookingId={selectedBookingId}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  )
}