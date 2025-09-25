"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { name: "Jan", total: 1200000 },
  { name: "Feb", total: 1350000 },
  { name: "Mar", total: 980000 },
  { name: "Apr", total: 1450000 },
  { name: "May", total: 1680000 },
  { name: "Jun", total: 1520000 },
  { name: "Jul", total: 1780000 },
  { name: "Aug", total: 1950000 },
  { name: "Sep", total: 2100000 },
  { name: "Oct", total: 1850000 },
  { name: "Nov", total: 2200000 },
  { name: "Dec", total: 2350000 }
]

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
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
          tickFormatter={(value) => `฿${(value / 1000000).toFixed(1)}M`}
        />
        <Tooltip
          formatter={(value: number) => `฿${value.toLocaleString()}`}
          labelStyle={{ color: "#000" }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}