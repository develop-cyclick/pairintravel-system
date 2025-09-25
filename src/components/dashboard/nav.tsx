"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Plane, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3,
  Settings,
  CreditCard,
  Building2
} from "lucide-react"

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
    title: "Bookings",
    href: "/dashboard/bookings",
    icon: <Calendar className="h-4 w-4" />
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
    roles: ["ADMIN"]
  },
  {
    title: "Invoices",
    href: "/dashboard/invoices",
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: <BarChart3 className="h-4 w-4" />
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["ADMIN"]
  }
]

export function DashboardNav({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  return (
    <nav className="w-64 bg-gray-900 text-white">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-8">
          <Plane className="h-8 w-8" />
          <span className="text-xl font-bold">Flight Booking</span>
        </div>
        
        <ul className="space-y-2">
          {filteredItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}