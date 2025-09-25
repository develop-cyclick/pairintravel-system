"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Plane,
  Users,
  ShoppingCart,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  Building2,
  ChevronRight,
  CreditCard,
  CheckCircle
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-4 w-4" />
  },
  {
    title: "Purchase Orders",
    href: "/dashboard/purchase-orders",
    icon: <ShoppingCart className="h-4 w-4" />
  },
  {
    title: "Flights",
    href: "/dashboard/flights",
    icon: <Plane className="h-4 w-4" />
  },
  {
    title: "Customers",
    href: "/dashboard/customers",
    icon: <Users className="h-4 w-4" />
  },
  {
    title: "Departments",
    href: "/dashboard/departments",
    icon: <Building2 className="h-4 w-4" />,
    roles: ["ADMIN", "AGENT"]
  },
  {
    title: "Credit Cards",
    href: "/dashboard/credit-cards",
    icon: <CreditCard className="h-4 w-4" />,
    roles: ["ADMIN", "AGENT"]
  },
  {
    title: "Invoices",
    href: "/dashboard/invoices",
    icon: <Receipt className="h-4 w-4" />
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: <BarChart3 className="h-4 w-4" />
  },
  {
    title: "Validation",
    href: "/dashboard/validation",
    icon: <CheckCircle className="h-4 w-4" />,
    roles: ["ADMIN"]
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["ADMIN", "AGENT"]
  }
]

export function AppSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <SidebarMenuButton asChild size="lg">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Flight Booking</span>
              <span className="text-xs text-muted-foreground">Thai Government</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center py-2">
              <span className="text-xs text-muted-foreground">© 2024 Thai Government</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}