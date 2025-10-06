"use client"

import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, LogOut, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface UserNavProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
    organizationName?: string | null
  }
}

export function UserNav({ user }: UserNavProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive"
      case "AGENT":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{user.name || user.email}</span>
          <Badge variant={getRoleBadgeVariant(user.role)} className="ml-2">
            {user.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        {user.organizationName && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                <Building2 className="h-3.5 w-3.5" />
                <span>{user.organizationName}</span>
              </div>
            </DropdownMenuLabel>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}