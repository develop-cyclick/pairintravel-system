import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OrganizationsClient } from '@/components/organizations/organizations-client'

export default async function OrganizationsPage() {
  const session = await getServerSession(authOptions)

  // Only ADMIN can access this page
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
          <p className="text-sm text-muted-foreground">
            Manage organizations and their settings
          </p>
        </div>
      </div>

      <OrganizationsClient />
    </div>
  )
}
