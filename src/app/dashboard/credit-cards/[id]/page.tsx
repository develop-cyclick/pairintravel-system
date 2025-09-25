"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, TrendingUp, TrendingDown, Plus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface CreditCardDetails {
  id: string
  cardNumber: string
  cardName: string
  cardType: string
  cardHolder: string
  expiryMonth: number
  expiryYear: number
  creditLimit: number
  availableCredit: number
  isActive: boolean
  department?: {
    id: string
    nameEn: string
    nameTh: string
  }
  usagePercentage: number
  transactionCount: number
  transactions: Transaction[]
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string
  transactionType: "CHARGE" | "PAYMENT" | "REFUND" | "ADJUSTMENT"
  amount: number
  description: string
  referenceNumber?: string
  balanceBefore: number
  balanceAfter: number
  createdAt: string
  purchaseOrder?: {
    poNumber: string
    type: string
    status: string
  }
}

export default function CreditCardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [card, setCard] = useState<CreditCardDetails | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const { toast } = useToast()

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    transactionType: "PAYMENT" as const,
    amount: 0,
    description: "",
    referenceNumber: ""
  })

  useEffect(() => {
    if (params.id) {
      fetchCardDetails()
      fetchTransactions()
    }
  }, [params.id])

  const fetchCardDetails = async () => {
    try {
      const response = await fetch(`/api/credit-cards/${params.id}`)
      if (!response.ok) throw new Error("Failed to fetch credit card details")
      const data = await response.json()
      setCard(data)
    } catch (error) {
      console.error("Error fetching credit card:", error)
      toast({
        title: "Error",
        description: "Failed to load credit card details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/credit-cards/${params.id}/transactions`)
      if (!response.ok) throw new Error("Failed to fetch transactions")
      const data = await response.json()
      setTransactions(data.transactions)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  const handleAddTransaction = async () => {
    try {
      const response = await fetch(`/api/credit-cards/${params.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add transaction")
      }

      toast({
        title: "Success",
        description: "Transaction added successfully"
      })

      setIsTransactionDialogOpen(false)
      fetchCardDetails()
      fetchTransactions()
      
      // Reset form
      setTransactionForm({
        transactionType: "PAYMENT",
        amount: 0,
        description: "",
        referenceNumber: ""
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "CHARGE":
        return "destructive"
      case "PAYMENT":
        return "default"
      case "REFUND":
        return "secondary"
      case "ADJUSTMENT":
        return "outline"
      default:
        return "default"
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "CHARGE":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "PAYMENT":
      case "REFUND":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "ADJUSTMENT":
        return <DollarSign className="h-4 w-4 text-blue-500" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading credit card details...</p>
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-xl">Credit card not found</p>
          <Button onClick={() => router.push("/dashboard/credit-cards")} className="mt-4">
            Back to Credit Cards
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/credit-cards")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{card.cardName}</h1>
          <p className="text-muted-foreground mt-1">
            {card.cardNumber.replace(/(\d{4})/g, "$1 ").trim()} • {card.cardType}
          </p>
        </div>
        <Badge variant={card.isActive ? "default" : "secondary"} className="text-lg px-4 py-2">
          {card.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Limit</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{card.creditLimit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{card.availableCredit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((card.availableCredit / card.creditLimit) * 100).toFixed(1)}% available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Credit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{(card.creditLimit - card.availableCredit).toLocaleString()}
            </div>
            <Progress value={card.usagePercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.transactionCount}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Card Details and Transactions */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="details">Card Details</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>View all transactions for this credit card</CardDescription>
                </div>
                <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Transaction</DialogTitle>
                      <DialogDescription>
                        Record a manual transaction for this credit card
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="transactionType">Transaction Type</Label>
                        <Select 
                          value={transactionForm.transactionType} 
                          onValueChange={(value: any) => setTransactionForm({ ...transactionForm, transactionType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAYMENT">Payment</SelectItem>
                            <SelectItem value="CHARGE">Charge</SelectItem>
                            <SelectItem value="REFUND">Refund</SelectItem>
                            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={transactionForm.amount}
                          onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) })}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={transactionForm.description}
                          onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                          placeholder="Enter transaction description"
                        />
                      </div>

                      <div>
                        <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                        <Input
                          id="referenceNumber"
                          value={transactionForm.referenceNumber}
                          onChange={(e) => setTransactionForm({ ...transactionForm, referenceNumber: e.target.value })}
                          placeholder="REF-123456"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-4">
                      <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddTransaction}>
                        Add Transaction
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance Before</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.createdAt), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transactionType)}
                          <Badge variant={getTransactionTypeColor(transaction.transactionType)}>
                            {transaction.transactionType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{transaction.description}</div>
                          {transaction.purchaseOrder && (
                            <div className="text-xs text-muted-foreground">
                              PO: {transaction.purchaseOrder.poNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.referenceNumber || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={transaction.transactionType === "CHARGE" ? "text-red-500" : "text-green-500"}>
                          {transaction.transactionType === "CHARGE" ? "-" : "+"}
                          ฿{transaction.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        ฿{transaction.balanceBefore.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ฿{transaction.balanceAfter.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Card Information</CardTitle>
              <CardDescription>Detailed information about this credit card</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Card Number</Label>
                    <p className="text-lg font-medium">
                      {card.cardNumber.replace(/(\d{4})/g, "$1 ").trim()}
                    </p>
                  </div>
                  <div>
                    <Label>Card Type</Label>
                    <p className="text-lg font-medium">{card.cardType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Card Holder</Label>
                    <p className="text-lg font-medium">{card.cardHolder}</p>
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <p className="text-lg font-medium">
                      {card.expiryMonth.toString().padStart(2, "0")}/{card.expiryYear}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <p className="text-lg font-medium">
                      {card.department ? (
                        <>
                          {card.department.nameEn}
                          <span className="text-sm text-muted-foreground block">
                            {card.department.nameTh}
                          </span>
                        </>
                      ) : (
                        "No Department Assigned"
                      )}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={card.isActive ? "default" : "secondary"} className="text-lg px-3 py-1">
                      {card.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Created Date</Label>
                    <p className="text-lg font-medium">
                      {format(new Date(card.createdAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <Label>Last Updated</Label>
                    <p className="text-lg font-medium">
                      {format(new Date(card.updatedAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}