'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  email: string
  name: string
  role: string
  organization: {
    name: string
    code: string
  }
  _count?: {
    bookings: number
    invoices: number
  }
}

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onSuccess: () => void
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess
}: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const hasData = (user._count?.bookings ?? 0) > 0 || (user._count?.invoices ?? 0) > 0

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      onSuccess()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">
              {user.organization.name} ({user.organization.code})
            </p>
            <p className="text-sm text-muted-foreground mt-1">Role: {user.role}</p>
          </div>

          {hasData && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: This user has associated data:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {(user._count?.bookings ?? 0) > 0 && (
                    <li>{user._count?.bookings} booking(s)</li>
                  )}
                  {(user._count?.invoices ?? 0) > 0 && (
                    <li>{user._count?.invoices} invoice(s)</li>
                  )}
                </ul>
                <p className="mt-2">
                  Deleting this user will not remove their associated records, but those records will no longer have a valid user reference.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. This will permanently delete the user
              and remove their access from the system.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
