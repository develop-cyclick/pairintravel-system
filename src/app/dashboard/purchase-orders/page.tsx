"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, Search, FileText, Eye, Edit, Trash2, 
  ShoppingCart, Users, Plane, Package, DollarSign,
  Calendar, Building2, User
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const MAX_PASSENGERS_PER_BOOKING = 9

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchPurchaseOrders()
  }, [statusFilter, typeFilter])

  const fetchPurchaseOrders = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (typeFilter !== "all") params.append("type", typeFilter)

      const response = await fetch(`/api/purchase-orders?${params}`, {
        credentials: "include"
      })

      if (response.ok) {
        const data = await response.json()
        setPurchaseOrders(data.purchaseOrders || [])
      } else {
        toast.error("Failed to fetch purchase orders")
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error)
      toast.error("Failed to fetch purchase orders")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
        credentials: "include"
      })

      if (response.ok) {
        toast.success("Purchase order deleted successfully")
        fetchPurchaseOrders()
      } else {
        toast.error("Failed to delete purchase order")
      }
    } catch (error) {
      toast.error("Failed to delete purchase order")
    } finally {
      setDeleteId(null)
    }
  }

  const filteredOrders = purchaseOrders.filter(po => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        po.poNumber.toLowerCase().includes(search) ||
        po.department?.nameEn?.toLowerCase().includes(search) ||
        po.customer?.firstName?.toLowerCase().includes(search) ||
        po.customer?.lastName?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      CONFIRMED: "default",
      CANCELLED: "destructive",
      COMPLETED: "outline"
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        {type === "FLIGHT" ? <Plane className="h-3 w-3" /> : <Package className="h-3 w-3" />}
        {type}
      </Badge>
    )
  }

  const calculateTotalPassengers = (po: any) => {
    let total = 0
    if (po.bookings) {
      po.bookings.forEach((booking: any) => {
        total += booking.passengers?.length || 0
      })
    }
    if (po.tourBookings) {
      po.tourBookings.forEach((booking: any) => {
        total += booking.passengers?.length || 0
      })
    }
    return total
  }

  const calculateBookingCount = (po: any) => {
    return (po.bookings?.length || 0) + (po.tourBookings?.length || 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">
            Manage purchase orders for flights and tour packages
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/purchase-orders/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Active purchase orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From all orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseOrders.reduce((sum, po) => sum + calculateTotalPassengers(po), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{purchaseOrders.reduce((sum, po) => sum + (po.profit || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Net profit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
          <CardDescription>View and manage all purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number, customer, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FLIGHT">Flight</SelectItem>
                <SelectItem value="TOUR">Tour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading purchase orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No purchase orders found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer/Department</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{getTypeBadge(po.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {po.department ? (
                            <>
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{po.department.code}</p>
                                <p className="text-xs text-muted-foreground">{po.department.nameEn}</p>
                              </div>
                            </>
                          ) : po.customer ? (
                            <>
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {po.customer.firstName} {po.customer.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{po.customer.email}</p>
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calculateBookingCount(po)} booking{calculateBookingCount(po) !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {calculateTotalPassengers(po)}
                        </div>
                      </TableCell>
                      <TableCell>฿{po.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ฿{(po.profit || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(po.createdAt), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/purchase-orders/${po.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/purchase-orders/${po.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(po.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase order
              and all associated bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}