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
  Check
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

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("general")
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  
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

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers()
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {session?.user?.role === "ADMIN" && (
            <TabsTrigger value="users">Users</TabsTrigger>
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