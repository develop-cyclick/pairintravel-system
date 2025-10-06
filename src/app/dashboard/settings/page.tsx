"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Settings,
  User,
  Lock,
  Shield,
  Globe,
  Bell,
  Database,
  Save,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Check,
  MapPin,
  Plane,
  Building2
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface UserData {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  _count: {
    bookings: number
    invoices: number
  }
}

interface DestinationData {
  id: string
  code: string
  name: string
  fullName?: string
  city: string
  country: string
  timezone?: string
  isActive: boolean
  isPopular: boolean
  createdAt: string
}

interface AirlineData {
  id: string
  code: string
  name: string
  fullName?: string
  country: string
  logo?: string
  website?: string
  isActive: boolean
  isPopular: boolean
  createdAt: string
}

interface CompanySettingsData {
  companyName: string
  companyNameTh: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyTaxId: string
  logo?: string | null
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("general")
  const [users, setUsers] = useState<UserData[]>([])
  const [destinations, setDestinations] = useState<DestinationData[]>([])
  const [airlines, setAirlines] = useState<AirlineData[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [isAddDestinationOpen, setIsAddDestinationOpen] = useState(false)
  const [isEditDestinationOpen, setIsEditDestinationOpen] = useState(false)
  const [isAddAirlineOpen, setIsAddAirlineOpen] = useState(false)
  const [isEditAirlineOpen, setIsEditAirlineOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<DestinationData | null>(null)
  const [selectedAirline, setSelectedAirline] = useState<AirlineData | null>(null)
  
  // Form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "AGENT"
  })

  const [editUserForm, setEditUserForm] = useState({
    email: "",
    name: "",
    role: "",
    password: ""
  })

  const [newDestinationForm, setNewDestinationForm] = useState({
    code: "",
    name: "",
    fullName: "",
    city: "",
    country: "Thailand",
    timezone: "",
    isActive: true,
    isPopular: false
  })

  const [editDestinationForm, setEditDestinationForm] = useState({
    code: "",
    name: "",
    fullName: "",
    city: "",
    country: "",
    timezone: "",
    isActive: true,
    isPopular: false
  })

  const [newAirlineForm, setNewAirlineForm] = useState({
    code: "",
    name: "",
    fullName: "",
    country: "Thailand",
    logo: "",
    website: "",
    isActive: true,
    isPopular: false
  })

  const [editAirlineForm, setEditAirlineForm] = useState({
    code: "",
    name: "",
    fullName: "",
    country: "",
    logo: "",
    website: "",
    isActive: true,
    isPopular: false
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoBackup: true,
    twoFactorAuth: false,
    language: "en",
    timezone: "Asia/Bangkok",
    dateFormat: "DD/MM/YYYY",
    currency: "THB"
  })

  const [companySettings, setCompanySettings] = useState<CompanySettingsData>({
    companyName: "",
    companyNameTh: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    companyTaxId: "",
    logo: null
  })

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers()
      fetchDestinations()
      fetchAirlines()
      fetchCompanySettings()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
    }
  }

  const fetchDestinations = async () => {
    try {
      const response = await fetch("/api/destinations")
      if (response.ok) {
        const data = await response.json()
        setDestinations(data)
      }
    } catch (error) {
      console.error("Error fetching destinations:", error)
      toast.error("Failed to load destinations")
    }
  }

  const fetchAirlines = async () => {
    try {
      const response = await fetch("/api/airlines")
      if (response.ok) {
        const data = await response.json()
        setAirlines(data)
      }
    } catch (error) {
      console.error("Error fetching airlines:", error)
      toast.error("Failed to load airlines")
    }
  }

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/settings/company")
      if (response.ok) {
        const data = await response.json()
        setCompanySettings(data)
      }
    } catch (error) {
      console.error("Error fetching company settings:", error)
      toast.error("Failed to load company settings")
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      })

      if (response.ok) {
        toast.success("Password updated successfully")
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        })
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update password")
      }
    } catch (error) {
      toast.error("Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm)
      })

      if (response.ok) {
        toast.success("User added successfully")
        setIsAddUserOpen(false)
        setNewUserForm({
          email: "",
          password: "",
          name: "",
          role: "AGENT"
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add user")
      }
    } catch (error) {
      toast.error("Failed to add user")
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    setLoading(true)
    try {
      const updateData: any = {
        name: editUserForm.name,
        email: editUserForm.email,
        role: editUserForm.role
      }
      
      if (editUserForm.password) {
        updateData.password = editUserForm.password
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        toast.success("User updated successfully")
        setIsEditUserOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error("Failed to update user")
      }
    } catch (error) {
      toast.error("Failed to update user")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("User deleted successfully")
        fetchUsers()
      } else {
        toast.error("Failed to delete user")
      }
    } catch (error) {
      toast.error("Failed to delete user")
    }
  }

  const handleSavePreferences = () => {
    // In a real app, this would save to the backend
    localStorage.setItem("userPreferences", JSON.stringify(preferences))
    toast.success("Preferences saved successfully")
  }

  const handleSaveCompanySettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings)
      })

      if (response.ok) {
        toast.success("Company settings saved successfully")
        fetchCompanySettings()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save company settings")
      }
    } catch (error) {
      toast.error("Failed to save company settings")
    } finally {
      setLoading(false)
    }
  }

  // Destination handlers
  const handleAddDestination = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDestinationForm)
      })

      if (response.ok) {
        toast.success("Destination added successfully")
        setIsAddDestinationOpen(false)
        setNewDestinationForm({
          code: "",
          name: "",
          fullName: "",
          city: "",
          country: "Thailand",
          timezone: "",
          isActive: true,
          isPopular: false
        })
        fetchDestinations()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add destination")
      }
    } catch (error) {
      toast.error("Failed to add destination")
    } finally {
      setLoading(false)
    }
  }

  const handleEditDestination = async () => {
    if (!selectedDestination) return

    setLoading(true)
    try {
      const response = await fetch(`/api/destinations/${selectedDestination.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDestinationForm)
      })

      if (response.ok) {
        toast.success("Destination updated successfully")
        setIsEditDestinationOpen(false)
        setSelectedDestination(null)
        fetchDestinations()
      } else {
        toast.error("Failed to update destination")
      }
    } catch (error) {
      toast.error("Failed to update destination")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDestination = async (destinationId: string) => {
    if (!confirm("Are you sure you want to deactivate this destination?")) return

    try {
      const response = await fetch(`/api/destinations/${destinationId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Destination deactivated successfully")
        fetchDestinations()
      } else {
        toast.error("Failed to deactivate destination")
      }
    } catch (error) {
      toast.error("Failed to deactivate destination")
    }
  }

  // Airline handlers
  const handleAddAirline = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/airlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAirlineForm)
      })

      if (response.ok) {
        toast.success("Airline added successfully")
        setIsAddAirlineOpen(false)
        setNewAirlineForm({
          code: "",
          name: "",
          fullName: "",
          country: "Thailand",
          logo: "",
          website: "",
          isActive: true,
          isPopular: false
        })
        fetchAirlines()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add airline")
      }
    } catch (error) {
      toast.error("Failed to add airline")
    } finally {
      setLoading(false)
    }
  }

  const handleEditAirline = async () => {
    if (!selectedAirline) return

    setLoading(true)
    try {
      const response = await fetch(`/api/airlines/${selectedAirline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAirlineForm)
      })

      if (response.ok) {
        toast.success("Airline updated successfully")
        setIsEditAirlineOpen(false)
        setSelectedAirline(null)
        fetchAirlines()
      } else {
        toast.error("Failed to update airline")
      }
    } catch (error) {
      toast.error("Failed to update airline")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAirline = async (airlineId: string) => {
    if (!confirm("Are you sure you want to deactivate this airline?")) return

    try {
      const response = await fetch(`/api/airlines/${airlineId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Airline deactivated successfully")
        fetchAirlines()
      } else {
        toast.error("Failed to deactivate airline")
      }
    } catch (error) {
      toast.error("Failed to deactivate airline")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6 lg:w-[1000px]">
          <TabsTrigger value="general">General</TabsTrigger>
          {session?.user?.role === "ADMIN" && (
            <TabsTrigger value="company">Company</TabsTrigger>
          )}
          <TabsTrigger value="security">Security</TabsTrigger>
          {session?.user?.role === "ADMIN" && (
            <TabsTrigger value="users">Users</TabsTrigger>
          )}
          {session?.user?.role === "ADMIN" && (
            <TabsTrigger value="master-data">Master Data</TabsTrigger>
          )}
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={session?.user?.name || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={session?.user?.email || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={session?.user?.role || ""} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={preferences.language}
                    onValueChange={(v) => setPreferences({...preferences, language: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="th">ไทย (Thai)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={preferences.timezone}
                    onValueChange={(v) => setPreferences({...preferences, timezone: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Bangkok">Bangkok (GMT+7)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={preferences.dateFormat}
                    onValueChange={(v) => setPreferences({...preferences, dateFormat: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={preferences.currency}
                    onValueChange={(v) => setPreferences({...preferences, currency: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THB">THB (฿)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about bookings
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.emailNotifications}
                    onCheckedChange={(v) => setPreferences({...preferences, emailNotifications: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive SMS alerts for important events
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.smsNotifications}
                    onCheckedChange={(v) => setPreferences({...preferences, smsNotifications: v})}
                  />
                </div>
              </div>

              <Button onClick={handleSavePreferences}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {session?.user?.role === "ADMIN" && (
          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Manage company details that appear on invoices and documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name (English)</Label>
                    <Input
                      id="companyName"
                      value={companySettings.companyName}
                      onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
                      placeholder="PT System Co., Ltd."
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyNameTh">Company Name (Thai)</Label>
                    <Input
                      id="companyNameTh"
                      value={companySettings.companyNameTh}
                      onChange={(e) => setCompanySettings({...companySettings, companyNameTh: e.target.value})}
                      placeholder="บริษัท พีที ซิสเต็ม จำกัด"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyAddress">Address</Label>
                  <Input
                    id="companyAddress"
                    value={companySettings.companyAddress}
                    onChange={(e) => setCompanySettings({...companySettings, companyAddress: e.target.value})}
                    placeholder="Bangkok, Thailand"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyPhone">Phone Number</Label>
                    <Input
                      id="companyPhone"
                      value={companySettings.companyPhone}
                      onChange={(e) => setCompanySettings({...companySettings, companyPhone: e.target.value})}
                      placeholder="02-XXX-XXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companySettings.companyEmail}
                      onChange={(e) => setCompanySettings({...companySettings, companyEmail: e.target.value})}
                      placeholder="info@ptsystem.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyTaxId">Tax ID</Label>
                  <Input
                    id="companyTaxId"
                    value={companySettings.companyTaxId}
                    onChange={(e) => setCompanySettings({...companySettings, companyTaxId: e.target.value})}
                    placeholder="0105561213350"
                  />
                </div>

                <div>
                  <Label htmlFor="companyLogo">Logo URL (Optional)</Label>
                  <Input
                    id="companyLogo"
                    value={companySettings.logo || ""}
                    onChange={(e) => setCompanySettings({...companySettings, logo: e.target.value || null})}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Leave empty to use default logo
                  </p>
                </div>

                <Button onClick={handleSaveCompanySettings} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Company Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password regularly for security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                />
              </div>
              <Button onClick={handleChangePassword} disabled={loading}>
                <Lock className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Additional security options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch 
                  checked={preferences.twoFactorAuth}
                  onCheckedChange={(v) => setPreferences({...preferences, twoFactorAuth: v})}
                />
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Last login: {format(new Date(), "MMM dd, yyyy HH:mm")}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {session?.user?.role === "ADMIN" && (
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage system users and their roles
                    </CardDescription>
                  </div>
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="newName">Name</Label>
                          <Input
                            id="newName"
                            value={newUserForm.name}
                            onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="newEmail">Email</Label>
                          <Input
                            id="newEmail"
                            type="email"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPassword">Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="newRole">Role</Label>
                          <Select 
                            value={newUserForm.role}
                            onValueChange={(v) => setNewUserForm({...newUserForm, role: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="AGENT">Agent</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddUser} disabled={loading}>
                          Add User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === "ADMIN" ? "destructive" : 
                            user.role === "AGENT" ? "default" : 
                            "secondary"
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user._count.bookings}</TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setEditUserForm({
                                  email: user.email,
                                  name: user.name,
                                  role: user.role,
                                  password: ""
                                })
                                setIsEditUserOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.id !== session.user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="editName">Name</Label>
                    <Input
                      id="editName"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPassword">New Password (leave blank to keep current)</Label>
                    <Input
                      id="editPassword"
                      type="password"
                      value={editUserForm.password}
                      onChange={(e) => setEditUserForm({...editUserForm, password: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editRole">Role</Label>
                    <Select 
                      value={editUserForm.role}
                      onValueChange={(v) => setEditUserForm({...editUserForm, role: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="AGENT">Agent</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditUser} disabled={loading}>
                    Update User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {session?.user?.role === "ADMIN" && (
          <TabsContent value="master-data" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Destinations Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Destinations
                      </CardTitle>
                      <CardDescription>
                        Manage flight destinations and airports
                      </CardDescription>
                    </div>
                    <Dialog open={isAddDestinationOpen} onOpenChange={setIsAddDestinationOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Destination
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Destination</DialogTitle>
                          <DialogDescription>
                            Create a new destination for flight bookings
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="destCode">Code</Label>
                              <Input
                                id="destCode"
                                placeholder="BKK"
                                value={newDestinationForm.code}
                                onChange={(e) => setNewDestinationForm({...newDestinationForm, code: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="destName">Name</Label>
                              <Input
                                id="destName"
                                placeholder="Bangkok"
                                value={newDestinationForm.name}
                                onChange={(e) => setNewDestinationForm({...newDestinationForm, name: e.target.value})}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="destFullName">Full Name (Optional)</Label>
                            <Input
                              id="destFullName"
                              placeholder="Suvarnabhumi Airport (BKK)"
                              value={newDestinationForm.fullName}
                              onChange={(e) => setNewDestinationForm({...newDestinationForm, fullName: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="destCity">City</Label>
                              <Input
                                id="destCity"
                                placeholder="Bangkok"
                                value={newDestinationForm.city}
                                onChange={(e) => setNewDestinationForm({...newDestinationForm, city: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="destCountry">Country</Label>
                              <Input
                                id="destCountry"
                                value={newDestinationForm.country}
                                onChange={(e) => setNewDestinationForm({...newDestinationForm, country: e.target.value})}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="destTimezone">Timezone (Optional)</Label>
                            <Input
                              id="destTimezone"
                              placeholder="Asia/Bangkok"
                              value={newDestinationForm.timezone}
                              onChange={(e) => setNewDestinationForm({...newDestinationForm, timezone: e.target.value})}
                            />
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="destActive"
                                checked={newDestinationForm.isActive}
                                onCheckedChange={(checked) => setNewDestinationForm({...newDestinationForm, isActive: checked})}
                              />
                              <Label htmlFor="destActive">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="destPopular"
                                checked={newDestinationForm.isPopular}
                                onCheckedChange={(checked) => setNewDestinationForm({...newDestinationForm, isPopular: checked})}
                              />
                              <Label htmlFor="destPopular">Popular</Label>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleAddDestination} disabled={loading}>
                            Add Destination
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {destinations.map((destination) => (
                      <div key={destination.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={destination.isActive ? "default" : "secondary"}>
                            {destination.code}
                          </Badge>
                          <div>
                            <p className="font-medium">{destination.name}</p>
                            <p className="text-sm text-muted-foreground">{destination.city}, {destination.country}</p>
                          </div>
                          {destination.isPopular && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDestination(destination)
                              setEditDestinationForm({
                                code: destination.code,
                                name: destination.name,
                                fullName: destination.fullName || "",
                                city: destination.city,
                                country: destination.country,
                                timezone: destination.timezone || "",
                                isActive: destination.isActive,
                                isPopular: destination.isPopular
                              })
                              setIsEditDestinationOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDestination(destination.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Airlines Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Plane className="h-5 w-5" />
                        Airlines
                      </CardTitle>
                      <CardDescription>
                        Manage airline companies and carriers
                      </CardDescription>
                    </div>
                    <Dialog open={isAddAirlineOpen} onOpenChange={setIsAddAirlineOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Airline
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Airline</DialogTitle>
                          <DialogDescription>
                            Create a new airline for flight bookings
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="airlineCode">Code</Label>
                              <Input
                                id="airlineCode"
                                placeholder="TG"
                                value={newAirlineForm.code}
                                onChange={(e) => setNewAirlineForm({...newAirlineForm, code: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="airlineName">Name</Label>
                              <Input
                                id="airlineName"
                                placeholder="Thai Airways"
                                value={newAirlineForm.name}
                                onChange={(e) => setNewAirlineForm({...newAirlineForm, name: e.target.value})}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="airlineFullName">Full Name (Optional)</Label>
                            <Input
                              id="airlineFullName"
                              placeholder="Thai Airways International"
                              value={newAirlineForm.fullName}
                              onChange={(e) => setNewAirlineForm({...newAirlineForm, fullName: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="airlineCountry">Country</Label>
                            <Input
                              id="airlineCountry"
                              value={newAirlineForm.country}
                              onChange={(e) => setNewAirlineForm({...newAirlineForm, country: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="airlineLogo">Logo URL (Optional)</Label>
                            <Input
                              id="airlineLogo"
                              placeholder="https://example.com/logo.png"
                              value={newAirlineForm.logo}
                              onChange={(e) => setNewAirlineForm({...newAirlineForm, logo: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="airlineWebsite">Website (Optional)</Label>
                            <Input
                              id="airlineWebsite"
                              placeholder="https://thaiairways.com"
                              value={newAirlineForm.website}
                              onChange={(e) => setNewAirlineForm({...newAirlineForm, website: e.target.value})}
                            />
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="airlineActive"
                                checked={newAirlineForm.isActive}
                                onCheckedChange={(checked) => setNewAirlineForm({...newAirlineForm, isActive: checked})}
                              />
                              <Label htmlFor="airlineActive">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="airlinePopular"
                                checked={newAirlineForm.isPopular}
                                onCheckedChange={(checked) => setNewAirlineForm({...newAirlineForm, isPopular: checked})}
                              />
                              <Label htmlFor="airlinePopular">Popular</Label>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleAddAirline} disabled={loading}>
                            Add Airline
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {airlines.map((airline) => (
                      <div key={airline.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={airline.isActive ? "default" : "secondary"}>
                            {airline.code}
                          </Badge>
                          <div>
                            <p className="font-medium">{airline.name}</p>
                            <p className="text-sm text-muted-foreground">{airline.country}</p>
                          </div>
                          {airline.isPopular && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAirline(airline)
                              setEditAirlineForm({
                                code: airline.code,
                                name: airline.name,
                                fullName: airline.fullName || "",
                                country: airline.country,
                                logo: airline.logo || "",
                                website: airline.website || "",
                                isActive: airline.isActive,
                                isPopular: airline.isPopular
                              })
                              setIsEditAirlineOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAirline(airline.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Edit Destination Dialog */}
            <Dialog open={isEditDestinationOpen} onOpenChange={setIsEditDestinationOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Destination</DialogTitle>
                  <DialogDescription>
                    Update destination information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editDestCode">Code</Label>
                      <Input
                        id="editDestCode"
                        value={editDestinationForm.code}
                        onChange={(e) => setEditDestinationForm({...editDestinationForm, code: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editDestName">Name</Label>
                      <Input
                        id="editDestName"
                        value={editDestinationForm.name}
                        onChange={(e) => setEditDestinationForm({...editDestinationForm, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editDestFullName">Full Name</Label>
                    <Input
                      id="editDestFullName"
                      value={editDestinationForm.fullName}
                      onChange={(e) => setEditDestinationForm({...editDestinationForm, fullName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editDestCity">City</Label>
                      <Input
                        id="editDestCity"
                        value={editDestinationForm.city}
                        onChange={(e) => setEditDestinationForm({...editDestinationForm, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editDestCountry">Country</Label>
                      <Input
                        id="editDestCountry"
                        value={editDestinationForm.country}
                        onChange={(e) => setEditDestinationForm({...editDestinationForm, country: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editDestTimezone">Timezone</Label>
                    <Input
                      id="editDestTimezone"
                      value={editDestinationForm.timezone}
                      onChange={(e) => setEditDestinationForm({...editDestinationForm, timezone: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="editDestActive"
                        checked={editDestinationForm.isActive}
                        onCheckedChange={(checked) => setEditDestinationForm({...editDestinationForm, isActive: checked})}
                      />
                      <Label htmlFor="editDestActive">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="editDestPopular"
                        checked={editDestinationForm.isPopular}
                        onCheckedChange={(checked) => setEditDestinationForm({...editDestinationForm, isPopular: checked})}
                      />
                      <Label htmlFor="editDestPopular">Popular</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditDestination} disabled={loading}>
                    Update Destination
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Airline Dialog */}
            <Dialog open={isEditAirlineOpen} onOpenChange={setIsEditAirlineOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Airline</DialogTitle>
                  <DialogDescription>
                    Update airline information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editAirlineCode">Code</Label>
                      <Input
                        id="editAirlineCode"
                        value={editAirlineForm.code}
                        onChange={(e) => setEditAirlineForm({...editAirlineForm, code: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editAirlineName">Name</Label>
                      <Input
                        id="editAirlineName"
                        value={editAirlineForm.name}
                        onChange={(e) => setEditAirlineForm({...editAirlineForm, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editAirlineFullName">Full Name</Label>
                    <Input
                      id="editAirlineFullName"
                      value={editAirlineForm.fullName}
                      onChange={(e) => setEditAirlineForm({...editAirlineForm, fullName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editAirlineCountry">Country</Label>
                    <Input
                      id="editAirlineCountry"
                      value={editAirlineForm.country}
                      onChange={(e) => setEditAirlineForm({...editAirlineForm, country: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editAirlineLogo">Logo URL</Label>
                    <Input
                      id="editAirlineLogo"
                      value={editAirlineForm.logo}
                      onChange={(e) => setEditAirlineForm({...editAirlineForm, logo: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editAirlineWebsite">Website</Label>
                    <Input
                      id="editAirlineWebsite"
                      value={editAirlineForm.website}
                      onChange={(e) => setEditAirlineForm({...editAirlineForm, website: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="editAirlineActive"
                        checked={editAirlineForm.isActive}
                        onCheckedChange={(checked) => setEditAirlineForm({...editAirlineForm, isActive: checked})}
                      />
                      <Label htmlFor="editAirlineActive">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="editAirlinePopular"
                        checked={editAirlineForm.isPopular}
                        onCheckedChange={(checked) => setEditAirlineForm({...editAirlineForm, isPopular: checked})}
                      />
                      <Label htmlFor="editAirlinePopular">Popular</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditAirline} disabled={loading}>
                    Update Airline
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                System-wide settings and configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable daily automatic database backups
                  </p>
                </div>
                <Switch 
                  checked={preferences.autoBackup}
                  onCheckedChange={(v) => setPreferences({...preferences, autoBackup: v})}
                />
              </div>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Database: Neon PostgreSQL (Connected)
                </AlertDescription>
              </Alert>

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Storage: Cloudflare R2 (Configured)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Technical details about the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Version</span>
                  <span className="text-sm text-muted-foreground">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Framework</span>
                  <span className="text-sm text-muted-foreground">Next.js 15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm text-muted-foreground">PostgreSQL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Storage</span>
                  <span className="text-sm text-muted-foreground">Cloudflare R2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Environment</span>
                  <span className="text-sm text-muted-foreground">Development</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}