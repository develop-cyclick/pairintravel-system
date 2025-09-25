"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  BarChart3,
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
  Users,
  Plane,
  DollarSign,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"

interface DailyReport {
  date: string
  summary: {
    totalBookings: number
    confirmedBookings: number
    cancelledBookings: number
    totalRevenue: number
    totalFlights: number
    totalPassengers: number
    averageBookingValue: number
  }
  revenueByFlight: Array<{ route: string; revenue: number }>
  bookingsByHour: Array<{ hour: number; count: number }>
  topFlights: Array<{ flightNumber: string; route: string; occupancy: string }>
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [reportType, selectedDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const response = await fetch(`/api/reports/${reportType}?date=${dateStr}`)
      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error("Error fetching report:", error)
      toast.error("Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    toast.success("PDF export functionality coming soon!")
  }

  const handleExportExcel = () => {
    toast.success("Excel export functionality coming soon!")
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and analyze business reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileText className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily Report</SelectItem>
            <SelectItem value="weekly">Weekly Report</SelectItem>
            <SelectItem value="monthly">Monthly Report</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
          <CalendarIcon className="h-4 w-4" />
          <span>{format(selectedDate, "MMMM dd, yyyy")}</span>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading report...</p>
          </CardContent>
        </Card>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {report.summary.confirmedBookings} confirmed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ฿{report.summary.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: ฿{Math.round(report.summary.averageBookingValue).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalFlights}</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled flights
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalPassengers}</div>
                <p className="text-xs text-muted-foreground">
                  Across all bookings
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
              <TabsTrigger value="bookings">Booking Trends</TabsTrigger>
              <TabsTrigger value="routes">Route Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Bookings by Hour</CardTitle>
                    <CardDescription>
                      Distribution of bookings throughout the day
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={report.bookingsByHour}>
                        <XAxis 
                          dataKey="hour" 
                          tickFormatter={(h) => `${h}:00`}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(h) => `${h}:00`}
                          formatter={(value) => [`${value} bookings`, "Bookings"]}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Route</CardTitle>
                    <CardDescription>
                      Top performing routes by revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={report.revenueByFlight.slice(0, 5)}
                          dataKey="revenue"
                          nameKey="route"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `฿${entry.revenue.toLocaleString()}`}
                        >
                          {report.revenueByFlight.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `฿${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Flights</CardTitle>
                  <CardDescription>
                    Flights with highest occupancy rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.topFlights.map((flight, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-100 rounded">
                            <Plane className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{flight.flightNumber}</p>
                            <p className="text-sm text-muted-foreground">{flight.route}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{flight.occupancy}</p>
                          <p className="text-xs text-muted-foreground">Occupancy</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>
                    Detailed revenue analysis by route
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={report.revenueByFlight}>
                      <XAxis 
                        dataKey="route" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => `฿${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Patterns</CardTitle>
                  <CardDescription>
                    Hourly booking distribution and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={report.bookingsByHour}>
                      <XAxis 
                        dataKey="hour" 
                        tickFormatter={(h) => `${h}:00`}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(h) => `${h}:00`}
                        formatter={(value) => [`${value} bookings`, "Bookings"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="routes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Route Performance</CardTitle>
                  <CardDescription>
                    Analysis of route popularity and revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.revenueByFlight.map((route, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{route.route}</span>
                          <span className="text-sm text-muted-foreground">
                            ฿{route.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${(route.revenue / Math.max(...report.revenueByFlight.map(r => r.revenue))) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No report data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}