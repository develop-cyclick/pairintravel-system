import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { UserNav } from "@/components/dashboard/user-nav"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Building2 } from "lucide-react"

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar userRole={session.user.role} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Flight Booking System</h1>
              {session.user.organizationName && (
                <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{session.user.organizationName}</span>
                </Badge>
              )}
            </div>
            <UserNav user={session.user} />
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}