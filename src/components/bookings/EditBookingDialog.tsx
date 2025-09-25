"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const editBookingSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "RESCHEDULED"]),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  departmentId: z.string().optional(),
})

type EditBookingFormValues = z.infer<typeof editBookingSchema>

interface EditBookingDialogProps {
  bookingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditBookingDialog({ 
  bookingId, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditBookingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  
  const form = useForm<EditBookingFormValues>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: {
      status: "PENDING",
      type: "INDIVIDUAL",
      departmentId: "none",
    },
  })

  useEffect(() => {
    if (bookingId && open) {
      fetchBookingDetails()
      fetchDepartments()
    }
  }, [bookingId, open])

  const fetchBookingDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        credentials: "include"
      })
      if (response.ok) {
        const data = await response.json()
        form.reset({
          status: data.status,
          type: data.type,
          departmentId: data.departmentId || "none",
        })
      }
    } catch (error) {
      console.error("Error fetching booking details:", error)
      toast.error("Failed to load booking details")
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments", {
        credentials: "include"
      })
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const onSubmit = async (values: EditBookingFormValues) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          departmentId: values.departmentId === "none" ? null : values.departmentId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update booking")
      }

      toast.success("Booking updated successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating booking:", error)
      toast.error("Failed to update booking")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update booking information and status
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Update the booking status
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="GROUP">Group</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Specify if this is an individual or group booking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Personal Booking</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign this booking to a department
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Booking
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}