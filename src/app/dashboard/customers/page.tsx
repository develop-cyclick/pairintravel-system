"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, Search, Mail, Phone, Calendar, Globe, 
  MoreHorizontal, Eye, Edit, Trash2, Loader2 
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { toast } from "sonner"
import { format } from "date-fns"

interface Customer {
  id: string
  title: string
  firstName: string
  lastName: string
  email: string
  phone: string
  nationalId?: string
  passportNo?: string
  governmentId?: string
  governmentIdExpiryDate?: string
  dateOfBirth: string
  nationality: string
  createdAt: string
  bookings?: any[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationalId: "",
    passportNo: "",
    governmentId: "",
    governmentIdExpiryDate: "",
    dateOfBirth: "",
    nationality: "Thai"
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?page=1")
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async () => {
    // Validate required fields
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email || !newCustomer.dateOfBirth) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newCustomer.email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer)
      })

      const data = await response.json()

      if (!response.ok) {
        // Check for specific error messages
        if (response.status === 400 && data.error) {
          if (data.error.includes("already exists")) {
            toast.error("A customer with this email already exists")
          } else if (Array.isArray(data.error)) {
            // Handle validation errors
            const firstError = data.error[0]
            toast.error(firstError.message || "Validation error")
          } else {
            toast.error(data.error || "Failed to add customer")
          }
        } else {
          toast.error("Failed to add customer")
        }
        return
      }

      toast.success("Customer added successfully")
      setIsAddDialogOpen(false)
      fetchCustomers()
      setNewCustomer({
        title: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        nationalId: "",
        passportNo: "",
        governmentId: "",
        governmentIdExpiryDate: "",
        dateOfBirth: "",
        nationality: "Thai"
      })
    } catch (error) {
      console.error("Error adding customer:", error)
      toast.error("Failed to add customer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsEditDialogOpen(true)
  }

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return

    // Validate required fields
    if (!editingCustomer.firstName || !editingCustomer.lastName || !editingCustomer.email || !editingCustomer.dateOfBirth) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editingCustomer.email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCustomer)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.error) {
          toast.error(data.error || "Failed to update customer")
        } else {
          toast.error("Failed to update customer")
        }
        return
      }

      toast.success("Customer updated successfully")
      setIsEditDialogOpen(false)
      fetchCustomers()
    } catch (error) {
      console.error("Error updating customer:", error)
      toast.error("Failed to update customer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteCustomer = async () => {
    if (!selectedCustomer) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to delete customer")
        return
      }

      toast.success("Customer deleted successfully")
      setIsDeleteDialogOpen(false)
      fetchCustomers()
    } catch (error) {
      console.error("Error deleting customer:", error)
      toast.error("Failed to delete customer. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage customer information and booking history
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Select
                    value={newCustomer.title}
                    onValueChange={(v) => setNewCustomer({...newCustomer, title: v})}
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
                  <Label htmlFor="nationality">Nationality</Label>
                  <Select
                    value={newCustomer.nationality}
                    onValueChange={(v) => setNewCustomer({...newCustomer, nationality: v})}
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
                  <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="lastName"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={newCustomer.dateOfBirth}
                    onChange={(e) => setNewCustomer({...newCustomer, dateOfBirth: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="idNumber">
                    {newCustomer.nationality === "Thai" ? "National ID" : "Passport Number"}
                  </Label>
                  <Input
                    id="idNumber"
                    value={newCustomer.nationality === "Thai" ? newCustomer.nationalId : newCustomer.passportNo}
                    onChange={(e) => setNewCustomer({
                      ...newCustomer,
                      [newCustomer.nationality === "Thai" ? "nationalId" : "passportNo"]: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="governmentId">Government ID</Label>
                  <Input
                    id="governmentId"
                    value={newCustomer.governmentId}
                    onChange={(e) => setNewCustomer({...newCustomer, governmentId: e.target.value})}
                    placeholder="Driver's license, military ID, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="governmentIdExpiryDate">Government ID Expiry Date</Label>
                  <Input
                    id="governmentIdExpiryDate"
                    type="date"
                    value={newCustomer.governmentIdExpiryDate}
                    onChange={(e) => setNewCustomer({...newCustomer, governmentIdExpiryDate: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleAddCustomer} disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Database</CardTitle>
          <CardDescription>
            All registered customers and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading customers...</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No customers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>ID/Passport</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {customer.firstName[0]}{customer.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {customer.title} {customer.firstName} {customer.lastName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        {customer.nationality}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.nationalId || customer.passportNo || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(customer.dateOfBirth), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.bookings?.length || 0}
                    </TableCell>
                    <TableCell>
                      {format(new Date(customer.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View customer information and booking history
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-lg">
                    {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedCustomer.title} {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Date of Birth</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedCustomer.dateOfBirth), "MMMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Nationality</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.nationality}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">National ID / Passport</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.nationalId || selectedCustomer.passportNo || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Government ID</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.governmentId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Government ID Expiry</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.governmentIdExpiryDate
                      ? format(new Date(selectedCustomer.governmentIdExpiryDate), "MMMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Bookings</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.bookings?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedCustomer.createdAt), "MMMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Select
                    value={editingCustomer.title}
                    onValueChange={(v) => setEditingCustomer({...editingCustomer, title: v})}
                  >
                    <SelectTrigger id="edit-title">
                      <SelectValue />
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
                  <Label htmlFor="edit-nationality">Nationality</Label>
                  <Select
                    value={editingCustomer.nationality}
                    onValueChange={(v) => setEditingCustomer({...editingCustomer, nationality: v})}
                  >
                    <SelectTrigger id="edit-nationality">
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
                  <Label htmlFor="edit-firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-firstName"
                    value={editingCustomer.firstName}
                    onChange={(e) => setEditingCustomer({...editingCustomer, firstName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-lastName"
                    value={editingCustomer.lastName}
                    onChange={(e) => setEditingCustomer({...editingCustomer, lastName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-dateOfBirth"
                    type="date"
                    value={editingCustomer.dateOfBirth ? format(new Date(editingCustomer.dateOfBirth), "yyyy-MM-dd") : ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, dateOfBirth: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-idNumber">
                    {editingCustomer.nationality === "Thai" ? "National ID" : "Passport Number"}
                  </Label>
                  <Input
                    id="edit-idNumber"
                    value={editingCustomer.nationality === "Thai" ? (editingCustomer.nationalId || "") : (editingCustomer.passportNo || "")}
                    onChange={(e) => setEditingCustomer({
                      ...editingCustomer,
                      [editingCustomer.nationality === "Thai" ? "nationalId" : "passportNo"]: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-governmentId">Government ID</Label>
                  <Input
                    id="edit-governmentId"
                    value={editingCustomer.governmentId || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, governmentId: e.target.value})}
                    placeholder="Driver's license, military ID, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-governmentIdExpiryDate">Government ID Expiry Date</Label>
                  <Input
                    id="edit-governmentIdExpiryDate"
                    type="date"
                    value={editingCustomer.governmentIdExpiryDate ? format(new Date(editingCustomer.governmentIdExpiryDate), "yyyy-MM-dd") : ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, governmentIdExpiryDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCustomer} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Customer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer
              {selectedCustomer && ` ${selectedCustomer.firstName} ${selectedCustomer.lastName}`} from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomer} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}