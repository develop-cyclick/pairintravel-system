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

interface Organization {
  id: string
  code: string
  name: string
  _count?: {
    users: number
    customers: number
    bookings: number
  }
}

interface DeleteOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization
  onSuccess: () => void
}

export function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSuccess
}: DeleteOrganizationDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const hasData =
    (organization._count?.users ?? 0) > 0 ||
    (organization._count?.customers ?? 0) > 0 ||
    (organization._count?.bookings ?? 0) > 0

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete organization')
      }

      onSuccess()
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete organization',
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
          <DialogTitle>Delete Organization</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this organization?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="font-medium">{organization.name}</p>
            <p className="text-sm text-muted-foreground">Code: {organization.code}</p>
          </div>

          {hasData ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This organization cannot be deleted because it has associated data:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {(organization._count?.users ?? 0) > 0 && (
                    <li>{organization._count?.users} user(s)</li>
                  )}
                  {(organization._count?.customers ?? 0) > 0 && (
                    <li>{organization._count?.customers} customer(s)</li>
                  )}
                  {(organization._count?.bookings ?? 0) > 0 && (
                    <li>{organization._count?.bookings} booking(s)</li>
                  )}
                </ul>
                <p className="mt-2">
                  Please transfer or delete this data before removing the organization.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. This will permanently delete the organization
                and remove all associated data from the system.
              </AlertDescription>
            </Alert>
          )}
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
            disabled={loading || hasData}
          >
            {loading ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
