'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Building2, Users, UserCircle, Briefcase, FileText } from 'lucide-react'
import { CreateOrganizationDialog } from './create-organization-dialog'
import { EditOrganizationDialog } from './edit-organization-dialog'
import { DeleteOrganizationDialog } from './delete-organization-dialog'
import { useToast } from '@/hooks/use-toast'

interface Organization {
  id: string
  code: string
  name: string
  taxId: string
  address: string
  phone: string
  email: string
  isActive: boolean
  createdAt: string
  _count?: {
    users: number
    customers: number
    bookings: number
    departments: number
  }
}

export function OrganizationsClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations')

      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data = await response.json()
      setOrganizations(data)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load organizations',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setCreateOpen(false)
    fetchOrganizations()
    toast({
      title: 'Success',
      description: 'Organization created successfully'
    })
  }

  const handleEditSuccess = () => {
    setEditOpen(false)
    setSelectedOrg(null)
    fetchOrganizations()
    toast({
      title: 'Success',
      description: 'Organization updated successfully'
    })
  }

  const handleDeleteSuccess = () => {
    setDeleteOpen(false)
    setSelectedOrg(null)
    fetchOrganizations()
    toast({
      title: 'Success',
      description: 'Organization deleted successfully'
    })
  }

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org)
    setEditOpen(true)
  }

  const handleDelete = (org: Organization) => {
    setSelectedOrg(org)
    setDeleteOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading organizations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>
                View and manage all organizations in the system
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No organizations found</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Organization
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Statistics</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">Tax ID: {org.taxId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{org.email}</p>
                        <p className="text-muted-foreground">{org.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? 'default' : 'secondary'}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1" title="Users">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{org._count?.users || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Customers">
                          <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{org._count?.customers || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Bookings">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{org._count?.bookings || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Departments">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{org._count?.departments || 0}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(org)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(org)}
                          disabled={org.code === 'DEFAULT'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {selectedOrg && (
        <>
          <EditOrganizationDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            organization={selectedOrg}
            onSuccess={handleEditSuccess}
          />

          <DeleteOrganizationDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            organization={selectedOrg}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </>
  )
}
