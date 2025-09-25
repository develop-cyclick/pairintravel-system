"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { name: "Mon", bookings: 45 },
  { name: "Tue", bookings: 52 },
  { name: "Wed", bookings: 38 },
  { name: "Thu", bookings: 65 },
  { name: "Fri", bookings: 72 },
  { name: "Sat", bookings: 89 },
  { name: "Sun", bookings: 67 }
]

export function BookingsChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number) => `${value} bookings`}
          labelStyle={{ color: "#000" }}
        />
        <Bar
          dataKey="bookings"
          fill="#3b82f6"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}