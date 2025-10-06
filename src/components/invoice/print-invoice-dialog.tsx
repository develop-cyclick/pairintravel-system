"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Printer, Users, User, FileText, Eye } from "lucide-react"
import { toast } from "sonner"
import { InvoicePreviewModal } from "./invoice-preview-modal"
import { openPrintWindow, printToPDF, generatePrintHTML } from "./invoice-pdf-client"
import { openMultipleInvoicesForPrinting } from "./invoice-multiple-pdf-generator"

interface Passenger {
  id: string
  customer: {
    id: string
    title: string
    firstName: string
    lastName: string
    email: string
    phone: string
    passportNo?: string
    nationalId?: string
  }
}

interface PrintInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
}

export function PrintInvoiceDialog({
  open,
  onOpenChange,
  invoice
}: PrintInvoiceDialogProps) {
  const [printType, setPrintType] = useState<"individual" | "group">("group")
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Advanced Print Options
  const [billTo, setBillTo] = useState<"department" | "passenger" | "none">("department")
  const [showTravelDetails, setShowTravelDetails] = useState(true)
  const [flightSelection, setFlightSelection] = useState<"all" | "outbound" | "return">("all")

  // Collect all passengers from all bookings
  const getAllPassengers = () => {
    const passengers: Passenger[] = []
    
    if (invoice?.purchaseOrder?.bookings) {
      invoice.purchaseOrder.bookings.forEach((booking: any) => {
        if (booking.passengers) {
          passengers.push(...booking.passengers)
        }
      })
    }
    
    if (invoice?.purchaseOrder?.tourBookings) {
      invoice.purchaseOrder.tourBookings.forEach((booking: any) => {
        if (booking.passengers) {
          passengers.push(...booking.passengers)
        }
      })
    }
    
    return passengers
  }

  const passengers = getAllPassengers()

  const handlePassengerToggle = (passengerId: string) => {
    setSelectedPassengers(prev =>
      prev.includes(passengerId)
        ? prev.filter(id => id !== passengerId)
        : [...prev, passengerId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPassengers.length === passengers.length) {
      setSelectedPassengers([])
    } else {
      setSelectedPassengers(passengers.map(p => p.id))
    }
  }

  const handlePreview = () => {
    if (printType === "individual" && selectedPassengers.length === 0) {
      toast.error("Please select at least one passenger")
      return
    }
    setShowPreview(true)
  }

  const handlePrint = async () => {
    if (printType === "individual" && selectedPassengers.length === 0) {
      toast.error("Please select at least one passenger")
      return
    }

    setIsGenerating(true)
    try {
      // For individual invoices with multiple passengers, we need to handle them separately
      if (printType === "individual" && selectedPassengers.length > 1) {
        // Fetch each invoice HTML separately
        const invoicePromises = selectedPassengers.map(async (passengerId) => {
          const response = await fetch(`/api/invoices/${invoice.id}/print-html`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              type: "individual",
              passengerIds: [passengerId]
            })
          })

          if (!response.ok) {
            throw new Error(`Failed to generate invoice for passenger ${passengerId}`)
          }

          const data = await response.json()
          return {
            html: data.html,
            invoiceNumber: data.invoiceNumber
          }
        })

        const invoices = await Promise.all(invoicePromises)

        // Use queue-based printing for better control
        toast.info(`Preparing ${invoices.length} invoices for printing...`)

        // Convert to format expected by the queue function
        const invoiceData = invoices.map(inv => ({
          html: inv.html,
          invoiceNumber: inv.invoiceNumber
        }))

        // Open invoices using the queue system
        openMultipleInvoicesForPrinting(invoiceData)

        toast.success(`${invoices.length} invoices queued for printing. Each will open automatically.`)
      } else {
        // Single invoice (group or single individual)
        const response = await fetch(`/api/invoices/${invoice.id}/print-html`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            type: printType,
            passengerIds: printType === "individual" ? selectedPassengers : undefined,
            // Advanced print options
            billTo,
            showTravelDetails,
            flightSelection
          })
        })

        if (!response.ok) {
          throw new Error("Failed to generate invoice HTML")
        }

        const data = await response.json()

        if (data.html) {
          openPrintWindow(data.html, data.invoiceNumber || invoice.invoiceNumber)
          toast.success(`Invoice ready for printing`)
        } else {
          toast.error("No invoice HTML received")
        }
      }

      onOpenChange(false)
      setSelectedPassengers([])
      setPrintType("group")
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirmPrintFromPreview = async () => {
    setShowPreview(false)
    await handlePrint()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Invoice Options
          </DialogTitle>
          <DialogDescription>
            Choose how you want to print the invoice
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
          {/* Print Type Selection */}
          <div className="space-y-4">
            <Label>Invoice Type</Label>
            <RadioGroup value={printType} onValueChange={(value) => setPrintType(value as "individual" | "group")}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent">
                <RadioGroupItem value="group" id="group" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="group" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Group Invoice
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate a single invoice for all passengers in this purchase order
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent">
                <RadioGroupItem value="individual" id="individual" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Individual Invoice(s)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate separate invoices for selected passengers
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Passenger Selection (only shown for individual invoices) */}
          {printType === "individual" && passengers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Passengers</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedPassengers.length === passengers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              
              <ScrollArea className="h-[250px] border rounded-lg p-4">
                <div className="space-y-3">
                  {passengers.map((passenger, index) => (
                    <div key={passenger.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`passenger-${passenger.id}`}
                        checked={selectedPassengers.includes(passenger.id)}
                        onCheckedChange={() => handlePassengerToggle(passenger.id)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`passenger-${passenger.id}`}
                          className="cursor-pointer font-normal"
                        >
                          <div className="font-medium">
                            {index + 1}. {passenger.customer.title} {passenger.customer.firstName} {passenger.customer.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {passenger.customer.email}
                            {passenger.customer.passportNo && (
                              <span className="ml-2">• Passport: {passenger.customer.passportNo}</span>
                            )}
                            {passenger.customer.nationalId && (
                              <span className="ml-2">• ID: {passenger.customer.nationalId}</span>
                            )}
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedPassengers.length > 0 && (
                <div className="bg-accent/50 rounded-lg p-3">
                  <p className="text-sm">
                    <span className="font-medium">{selectedPassengers.length}</span> passenger(s) selected
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Advanced Print Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">Advanced Options</Label>
            </div>

            {/* Bill To Selection */}
            <div className="space-y-3">
              <Label>Bill To</Label>
              <RadioGroup value={billTo} onValueChange={(value) => setBillTo(value as "department" | "passenger" | "none")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="department" id="billto-dept" />
                  <Label htmlFor="billto-dept" className="cursor-pointer font-normal">
                    ชื่อหน่วยงาน (Department Name)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="passenger" id="billto-passenger" />
                  <Label htmlFor="billto-passenger" className="cursor-pointer font-normal">
                    ชื่อผู้เดินทาง (Passenger Name)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="billto-none" />
                  <Label htmlFor="billto-none" className="cursor-pointer font-normal">
                    ไม่ใส่ (No Bill To)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Show/Hide Travel Details */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-travel"
                checked={showTravelDetails}
                onCheckedChange={(checked) => setShowTravelDetails(checked as boolean)}
              />
              <Label htmlFor="show-travel" className="cursor-pointer font-normal">
                แสดงรายละเอียดการเดินทาง (Show Travel Details)
              </Label>
            </div>

            {/* Flight Selection (for round trips) */}
            {invoice?.purchaseOrder?.bookings?.some((b: any) => b.returnFlightNumber) && (
              <div className="space-y-3">
                <Label>เลือกเที่ยวบิน (Flight Selection)</Label>
                <RadioGroup value={flightSelection} onValueChange={(value) => setFlightSelection(value as "all" | "outbound" | "return")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="flight-all" />
                    <Label htmlFor="flight-all" className="cursor-pointer font-normal">
                      ทั้งหมด (All Flights)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outbound" id="flight-outbound" />
                    <Label htmlFor="flight-outbound" className="cursor-pointer font-normal">
                      เฉพาะขาไป (Outbound Only)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="return" id="flight-return" />
                    <Label htmlFor="flight-return" className="cursor-pointer font-normal">
                      เฉพาะขากลับ (Return Only)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Invoice Preview Info */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Invoice Details</span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="ml-2 font-medium">{invoice?.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">PO Number:</span>
                <span className="ml-2 font-medium">{invoice?.purchaseOrder?.poNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="ml-2 font-medium">฿{invoice?.totalAmount?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Passengers:</span>
                <span className="ml-2 font-medium">{passengers.length}</span>
              </div>
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePreview} disabled={isGenerating}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handlePrint} disabled={isGenerating}>
            {isGenerating ? (
              <>Generating...</>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                {printType === "individual" && selectedPassengers.length > 1
                  ? `Print ${selectedPassengers.length} Invoices`
                  : "Generate Invoice"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Invoice Preview Modal */}
    {invoice && (
      <InvoicePreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        invoiceId={invoice.id}
        type={printType}
        passengerIds={printType === "individual" ? selectedPassengers : undefined}
        onConfirmPrint={handleConfirmPrintFromPreview}
      />
    )}
    </>
  )
}