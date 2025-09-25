"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Department {
  id: string
  code: string
  nameEn: string
  nameTh: string
  taxId?: string
  ministry?: string
  address?: string
  phone?: string
  email?: string
  contactPerson?: string
  budget?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    bookings: number
  }
}

// Thai government ministries list
const MINISTRIES = [
  "Office of the Prime Minister",
  "Ministry of Defence",
  "Ministry of Finance",
  "Ministry of Foreign Affairs",
  "Ministry of Tourism and Sports",
  "Ministry of Social Development and Human Security",
  "Ministry of Higher Education, Science, Research and Innovation",
  "Ministry of Agriculture and Cooperatives",
  "Ministry of Transport",
  "Ministry of Natural Resources and Environment",
  "Ministry of Digital Economy and Society",
  "Ministry of Energy",
  "Ministry of Commerce",
  "Ministry of Interior",
  "Ministry of Justice",
  "Ministry of Labour",
  "Ministry of Culture",
  "Ministry of Education",
  "Ministry of Public Health",
  "Ministry of Industry"
]

export default function DepartmentsPage() {
  const { data: session } = useSession()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMinistry, setFilterMinistry] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  
  const [formData, setFormData] = useState({
    code: "",
    nameEn: "",
    nameTh: "",
    taxId: "",
    ministry: "",
    address: "",
    phone: "",
    email: "",
    contactPerson: "",
    budget: "",
    isActive: true
  })

  useEffect(() => {
    fetchDepartments()
  }, [filterStatus, filterMinistry])

  const fetchDepartments = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (filterStatus !== "all") params.append("isActive", filterStatus)
      if (filterMinistry !== "all") params.append("ministry", filterMinistry)

      const response = await fetch(`/api/departments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast.error("Failed to load departments")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchDepartments()
  }

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : undefined
        })
      })

      if (response.ok) {
        toast.success("Department added successfully")
        setIsAddDialogOpen(false)
        resetForm()
        fetchDepartments()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add department")
      }
    } catch (error) {
      toast.error("Failed to add department")
    }
  }

  const handleEdit = async () => {
    if (!selectedDepartment) return

    try {
      const response = await fetch(`/api/departments/${selectedDepartment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : undefined
        })
      })

      if (response.ok) {
        toast.success("Department updated successfully")
        setIsEditDialogOpen(false)
        setSelectedDepartment(null)
        resetForm()
        fetchDepartments()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update department")
      }
    } catch (error) {
      toast.error("Failed to update department")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete/deactivate this department?")) return

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchDepartments()
      } else {
        toast.error("Failed to delete department")
      }
    } catch (error) {
      toast.error("Failed to delete department")
    }
  }

  const resetForm = () => {
    setFormData({
      code: "",
      nameEn: "",
      nameTh: "",
      taxId: "",
      ministry: "",
      address: "",
      phone: "",
      email: "",
      contactPerson: "",
      budget: "",
      isActive: true
    })
  }

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setFormData({
      code: dept.code,
      nameEn: dept.nameEn,
      nameTh: dept.nameTh,
      taxId: dept.taxId || "",
      ministry: dept.ministry || "",
      address: dept.address || "",
      phone: dept.phone || "",
      email: dept.email || "",
      contactPerson: dept.contactPerson || "",
      budget: dept.budget?.toString() || "",
      isActive: dept.isActive
    })
    setIsEditDialogOpen(true)
  }

  const filteredDepartments = departments.filter(dept =>
    dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.nameTh.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isAdmin = session?.user?.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Government Departments</h2>
          <p className="text-muted-foreground">
            Manage Thai government departments for booking records
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
                <DialogDescription>
                  Register a new Thai government department
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Department Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        placeholder="e.g., MOF-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ministry">Ministry</Label>
                      <Select
                        value={formData.ministry}
                        onValueChange={(v) => setFormData({...formData, ministry: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select ministry" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINISTRIES.map(ministry => (
                            <SelectItem key={ministry} value={ministry}>
                              {ministry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="nameEn">Name (English)</Label>
                      <Input
                        id="nameEn"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
                        placeholder="Department name in English"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nameTh">Name (Thai)</Label>
                      <Input
                        id="nameTh"
                        value={formData.nameTh}
                        onChange={(e) => setFormData({...formData, nameTh: e.target.value})}
                        placeholder="ชื่อหน่วยงานภาษาไทย"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                        placeholder="e.g., 0-1054-00098-76-4"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="contact" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="Full address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="02-xxx-xxxx"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="department@gov.th"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                        placeholder="Name of primary contact"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="budget">Annual Travel Budget (THB)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({...formData, budget: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Active Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable this department for bookings
                        </p>
                      </div>
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(v) => setFormData({...formData, isActive: v})}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  Add Department
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMinistry} onValueChange={setFilterMinistry}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Ministries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ministries</SelectItem>
            {MINISTRIES.map(ministry => (
              <SelectItem key={ministry} value={ministry}>
                {ministry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">
              {departments.filter(d => d.isActive).length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departments.reduce((sum, d) => sum + (d._count?.bookings || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{departments.reduce((sum, d) => sum + (d.budget || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Annual travel budget
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ministries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(departments.map(d => d.ministry).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Represented ministries
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department List</CardTitle>
          <CardDescription>
            All registered Thai government departments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading departments...</p>
          ) : filteredDepartments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No departments found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name (EN/TH)</TableHead>
                  <TableHead>Ministry</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dept.nameEn}</p>
                        <p className="text-sm text-muted-foreground">{dept.nameTh}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {dept.ministry ? dept.ministry.replace("Ministry of ", "") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {dept.contactPerson && (
                          <div className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" />
                            {dept.contactPerson}
                          </div>
                        )}
                        {dept.phone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            {dept.phone}
                          </div>
                        )}
                        {dept.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {dept.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dept.budget ? `฿${dept.budget.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {dept._count?.bookings || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? "default" : "secondary"}>
                        {dept.isActive ? (
                          <><CheckCircle className="mr-1 h-3 w-3" /> Active</>
                        ) : (
                          <><XCircle className="mr-1 h-3 w-3" /> Inactive</>
                        )}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(dept)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dept.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-code">Department Code</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-ministry">Ministry</Label>
                  <Select
                    value={formData.ministry}
                    onValueChange={(v) => setFormData({...formData, ministry: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      {MINISTRIES.map(ministry => (
                        <SelectItem key={ministry} value={ministry}>
                          {ministry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-nameEn">Name (English)</Label>
                  <Input
                    id="edit-nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-nameTh">Name (Thai)</Label>
                  <Input
                    id="edit-nameTh"
                    value={formData.nameTh}
                    onChange={(e) => setFormData({...formData, nameTh: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-taxId">Tax ID</Label>
                  <Input
                    id="edit-taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                    placeholder="e.g., 0-1054-00098-76-4"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-contactPerson">Contact Person</Label>
                  <Input
                    id="edit-contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-budget">Annual Travel Budget (THB)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this department for bookings
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData({...formData, isActive: v})}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Update Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}