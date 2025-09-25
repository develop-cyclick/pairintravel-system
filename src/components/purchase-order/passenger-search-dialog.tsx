"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, User, Mail, Phone, Calendar, 
  CreditCard, Globe, Check, Loader2 
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface PassengerData {
  id?: string
  title: string
  firstName: string
  lastName: string
  email: string
  phone: string
  nationalId?: string
  passportNo?: string
  dateOfBirth: string
  nationality: string
}

interface PassengerSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPassenger: (passenger: PassengerData) => void
  excludePassengerIds?: string[]
}

export function PassengerSearchDialog({
  open,
  onOpenChange,
  onSelectPassenger,
  excludePassengerIds = []
}: PassengerSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [passengers, setPassengers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState<any>(null)

  useEffect(() => {
    if (open && searchTerm.length >= 2) {
      searchPassengers()
    }
  }, [searchTerm, open])

  const searchPassengers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}`, {
        credentials: "include"
      })

      if (response.ok) {
        const data = await response.json()
        // Filter out already selected passengers
        const filtered = data.filter((p: any) => !excludePassengerIds.includes(p.id))
        setPassengers(filtered)
      } else {
        toast.error("Failed to search passengers")
      }
    } catch (error) {
      console.error("Error searching passengers:", error)
      toast.error("Failed to search passengers")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPassenger = (passenger: any) => {
    const passengerData: PassengerData = {
      id: passenger.id,
      title: passenger.title || "",
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      email: passenger.email,
      phone: passenger.phone || "",
      nationalId: passenger.nationalId || "",
      passportNo: passenger.passportNo || "",
      dateOfBirth: passenger.dateOfBirth ? format(new Date(passenger.dateOfBirth), "yyyy-MM-dd") : "",
      nationality: passenger.nationality || "Thai"
    }
    
    onSelectPassenger(passengerData)
    onOpenChange(false)
    setSearchTerm("")
    setPassengers([])
    setSelectedPassenger(null)
  }

  const getPassengerBookingHistory = (passenger: any) => {
    // In a real app, this would show booking history
    return passenger.bookingCount || 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Existing Passengers</DialogTitle>
          <DialogDescription>
            Search and select from previously registered passengers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : passengers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm.length < 2 
                  ? "Enter at least 2 characters to search"
                  : "No passengers found"}
              </div>
            ) : (
              <div className="space-y-2">
                {passengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedPassenger?.id === passenger.id ? "bg-accent border-primary" : ""
                    }`}
                    onClick={() => setSelectedPassenger(passenger)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {passenger.title} {passenger.firstName} {passenger.lastName}
                          </span>
                          {getPassengerBookingHistory(passenger) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {getPassengerBookingHistory(passenger)} previous bookings
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span>{passenger.email}</span>
                          </div>
                          {passenger.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{passenger.phone}</span>
                            </div>
                          )}
                          {passenger.dateOfBirth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Born: {format(new Date(passenger.dateOfBirth), "dd MMM yyyy")}
                              </span>
                            </div>
                          )}
                          {passenger.nationality && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3" />
                              <span>{passenger.nationality}</span>
                            </div>
                          )}
                          {passenger.nationalId && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3 w-3" />
                              <span>ID: {passenger.nationalId}</span>
                            </div>
                          )}
                          {passenger.passportNo && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3 w-3" />
                              <span>Passport: {passenger.passportNo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedPassenger?.id === passenger.id && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectPassenger(passenger)
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Quick Actions */}
          {selectedPassenger && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedPassenger.firstName} {selectedPassenger.lastName}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPassenger(null)
                      onOpenChange(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleSelectPassenger(selectedPassenger)}>
                    Use This Passenger
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}