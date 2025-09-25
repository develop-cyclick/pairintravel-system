"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const recentBookings = [
  {
    id: "1",
    customer: "Somchai Jaidee",
    email: "somchai@example.com",
    route: "BKK → CNX",
    amount: 2500,
    avatar: ""
  },
  {
    id: "2",
    customer: "Siriporn Tanaka",
    email: "siriporn@example.com",
    route: "BKK → HKT",
    amount: 3200,
    avatar: ""
  },
  {
    id: "3",
    customer: "John Smith",
    email: "john@example.com",
    route: "BKK → USM",
    amount: 4500,
    avatar: ""
  },
  {
    id: "4",
    customer: "Pimchanok Wong",
    email: "pim@example.com",
    route: "BKK → HDY",
    amount: 1800,
    avatar: ""
  },
  {
    id: "5",
    customer: "Michael Chen",
    email: "michael@example.com",
    route: "HKT → BKK",
    amount: 3200,
    avatar: ""
  }
]

export function RecentBookings() {
  return (
    <div className="space-y-8">
      {recentBookings.map((booking) => (
        <div key={booking.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={booking.avatar} alt={booking.customer} />
            <AvatarFallback>
              {booking.customer.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{booking.customer}</p>
            <p className="text-sm text-muted-foreground">
              {booking.route}
            </p>
          </div>
          <div className="ml-auto font-medium">
            +฿{booking.amount.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}