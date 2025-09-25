"use client"

import { useState, useEffect } from "react"
import { Plus, CreditCard, Edit, Trash2, Eye, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface CreditCard {
  id: string
  cardNumber: string
  cardName: string
  cardType: "VISA" | "MASTERCARD" | "AMEX" | "JCB" | "UNIONPAY" | "OTHER"
  cardHolder: string
  expiryMonth: number
  expiryYear: number
  creditLimit: number
  availableCredit: number
  isActive: boolean
  departmentId?: string
  department?: {
    id: string
    nameEn: string
    nameTh: string
  }
  usagePercentage: number
  transactionCount: number
  createdAt: string
  updatedAt: string
}

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const { toast } = useToast()

  // Form states
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardName: "",
    cardType: "VISA" as const,
    cardHolder: "",
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: new Date().getFullYear() + 1,
    creditLimit: 100000,
    departmentId: ""
  })

  useEffect(() => {
    fetchCreditCards()
    fetchDepartments()
  }, [])

  const fetchCreditCards = async () => {
    try {
      const response = await fetch("/api/credit-cards")
      if (!response.ok) throw new Error("Failed to fetch credit cards")
      const data = await response.json()
      setCreditCards(data)
    } catch (error) {
      console.error("Error fetching credit cards:", error)
      toast({
        title: "Error",
        description: "Failed to load credit cards",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      if (!response.ok) throw new Error("Failed to fetch departments")
      const data = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleAddCard = async () => {
    try {
      const response = await fetch("/api/credit-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add credit card")
      }

      toast({
        title: "Success",
        description: "Credit card added successfully"
      })

      setIsAddDialogOpen(false)
      fetchCreditCards()
      
      // Reset form
      setFormData({
        cardNumber: "",
        cardName: "",
        cardType: "VISA",
        cardHolder: "",
        expiryMonth: new Date().getMonth() + 1,
        expiryYear: new Date().getFullYear() + 1,
        creditLimit: 100000,
        departmentId: ""
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleToggleActive = async (card: CreditCard) => {
    try {
      const response = await fetch(`/api/credit-cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !card.isActive })
      })

      if (!response.ok) throw new Error("Failed to update credit card")

      toast({
        title: "Success",
        description: `Credit card ${!card.isActive ? "activated" : "deactivated"} successfully`
      })

      fetchCreditCards()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update credit card",
        variant: "destructive"
      })
    }
  }

  const formatCardNumber = (number: string) => {
    return number.replace(/(\d{4})/g, "$1 ").trim()
  }

  const getCardTypeColor = (type: string) => {
    switch (type) {
      case "VISA":
        return "bg-blue-500"
      case "MASTERCARD":
        return "bg-red-500"
      case "AMEX":
        return "bg-green-500"
      case "JCB":
        return "bg-purple-500"
      case "UNIONPAY":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading credit cards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Credit Card Management</h1>
          <p className="text-muted-foreground mt-2">Manage and track credit card limits and usage</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Credit Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Credit Card</DialogTitle>
              <DialogDescription>
                Enter the credit card details to add it to the system
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value.replace(/\s/g, "") })}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div>
                  <Label htmlFor="cardName">Card Name</Label>
                  <Input
                    id="cardName"
                    value={formData.cardName}
                    onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                    placeholder="Company Visa Card"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select value={formData.cardType} onValueChange={(value: any) => setFormData({ ...formData, cardType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISA">Visa</SelectItem>
                      <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                      <SelectItem value="AMEX">American Express</SelectItem>
                      <SelectItem value="JCB">JCB</SelectItem>
                      <SelectItem value="UNIONPAY">UnionPay</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cardHolder">Card Holder</Label>
                  <Input
                    id="cardHolder"
                    value={formData.cardHolder}
                    onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiryMonth">Expiry Month</Label>
                  <Select value={formData.expiryMonth.toString()} onValueChange={(value) => setFormData({ ...formData, expiryMonth: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {month.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiryYear">Expiry Year</Label>
                  <Select value={formData.expiryYear.toString()} onValueChange={(value) => setFormData({ ...formData, expiryYear: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="department">Department (Optional)</Label>
                <Select value={formData.departmentId || "none"} onValueChange={(value) => setFormData({ ...formData, departmentId: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nameEn} ({dept.nameTh})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCard}>
                Add Credit Card
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditCards.length}</div>
            <p className="text-xs text-muted-foreground">
              {creditCards.filter(c => c.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Limit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{creditCards.reduce((sum, card) => sum + card.creditLimit, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all cards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{creditCards.reduce((sum, card) => sum + card.availableCredit, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Usage</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {creditCards.length > 0 
                ? Math.round(creditCards.reduce((sum, card) => sum + card.usagePercentage, 0) / creditCards.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Credit utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Cards</CardTitle>
          <CardDescription>Manage your organization's credit cards</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Details</TableHead>
                <TableHead>Card Holder</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded ${getCardTypeColor(card.cardType)}`} />
                      <div>
                        <div className="font-medium">{card.cardName}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCardNumber(card.cardNumber)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expires {card.expiryMonth.toString().padStart(2, "0")}/{card.expiryYear}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{card.cardHolder}</TableCell>
                  <TableCell>
                    {card.department ? (
                      <div>
                        <div className="text-sm">{card.department.nameEn}</div>
                        <div className="text-xs text-muted-foreground">{card.department.nameTh}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>฿{card.creditLimit.toLocaleString()}</TableCell>
                  <TableCell>฿{card.availableCredit.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={card.usagePercentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {card.usagePercentage.toFixed(1)}% used
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={card.isActive ? "default" : "secondary"}>
                      {card.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.location.href = `/dashboard/credit-cards/${card.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(card)}
                      >
                        {card.isActive ? (
                          <Trash2 className="h-4 w-4" />
                        ) : (
                          <Edit className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}