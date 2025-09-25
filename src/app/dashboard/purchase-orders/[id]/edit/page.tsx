"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"

export default function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null)
  const [formData, setFormData] = useState({
    status: "",
    purpose: "",
    approvalRef: ""
  })

  useEffect(() => {
    fetchPurchaseOrder()
  }, [id])

  const fetchPurchaseOrder = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        credentials: "include"
      })

      if (response.ok) {
        const data = await response.json()
        setPurchaseOrder(data)
        setFormData({
          status: data.status || "PENDING",
          purpose: data.purpose || "",
          approvalRef: data.approvalRef || ""
        })
      } else {
        toast.error("Failed to fetch purchase order")
        router.push("/dashboard/purchase-orders")
      }
    } catch (error) {
      console.error("Error fetching purchase order:", error)
      toast.error("Failed to fetch purchase order")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Purchase order updated successfully")
        router.push(`/dashboard/purchase-orders/${params.id}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update purchase order")
      }
    } catch (error) {
      console.error("Error updating purchase order:", error)
      toast.error("Failed to update purchase order")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Purchase order not found</p>
        <Button onClick={() => router.push("/dashboard/purchase-orders")} className="mt-4">
          Back to Purchase Orders
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Purchase Order</h2>
          <p className="text-muted-foreground">
            Update purchase order #{purchaseOrder.poNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
            <CardDescription>
              Update the status and details of this purchase order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input value={purchaseOrder.poNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={purchaseOrder.type} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <Input value={`฿${purchaseOrder.totalAmount.toLocaleString()}`} disabled />
              </div>
              <div className="space-y-2">
                <Label>Profit</Label>
                <Input value={`฿${(purchaseOrder.profit || 0).toLocaleString()}`} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status*</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                placeholder="Enter the purpose of this purchase order"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approvalRef">Approval Reference</Label>
              <Input
                id="approvalRef"
                value={formData.approvalRef}
                onChange={(e) => setFormData({...formData, approvalRef: e.target.value})}
                placeholder="Enter approval reference number"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}