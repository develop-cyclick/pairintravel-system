import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plane,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Activity,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Building2
} from "lucide-react"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { BookingsChart } from "@/components/dashboard/bookings-chart"
import { RecentBookings } from "@/components/dashboard/recent-bookings"
import { getSessionOrganizationId, getOrganizationStats } from "@/lib/organization"

async function getDashboardStats() {
  try {
    const organizationId = await getSessionOrganizationId()
    const orgStats = await getOrganizationStats(organizationId)

    return {
      totalRevenue: orgStats.totalRevenue || 0,
      revenueChange: 20.5, // Calculate from historical data
      totalBookings: orgStats.totalBookings || 0,
      bookingsChange: 18.0, // Calculate from historical data
      activeFlights: 24, // This is shared across organizations
      flightsChange: -5.2,
      totalCustomers: orgStats.totalCustomers || 0,
      customersChange: 12.3 // Calculate from historical data
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      totalRevenue: 0,
      revenueChange: 0,
      totalBookings: 0,
      bookingsChange: 0,
      activeFlights: 0,
      flightsChange: 0,
      totalCustomers: 0,
      customersChange: 0
    }
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const stats = await getDashboardStats()

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          {session?.user.organizationName && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Showing data for {session.user.organizationName}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button>Download Report</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ฿{(stats.totalRevenue / 1000000).toFixed(2)}M
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className={stats.revenueChange > 0 ? "text-green-600" : "text-red-600"}>
                    {stats.revenueChange > 0 ? (
                      <ArrowUpRight className="inline h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="inline h-3 w-3" />
                    )}
                    {Math.abs(stats.revenueChange)}%
                  </span>
                  {" "}from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Bookings
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{stats.totalBookings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">
                    <ArrowUpRight className="inline h-3 w-3" />
                    {stats.bookingsChange}%
                  </span>
                  {" "}from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Flights
                </CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeFlights}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600">
                    <ArrowDownRight className="inline h-3 w-3" />
                    {Math.abs(stats.flightsChange)}%
                  </span>
                  {" "}from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Customers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{stats.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">
                    <ArrowUpRight className="inline h-3 w-3" />
                    {stats.customersChange}%
                  </span>
                  {" "}from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <RevenueChart />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>
                  Latest bookings from the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentBookings />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
                <CardDescription>
                  Daily booking activity over the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BookingsChart />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Routes</CardTitle>
                <CardDescription>
                  Most popular flight routes this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { route: "Bangkok → Phuket", bookings: 245, revenue: 784000 },
                    { route: "Bangkok → Chiang Mai", bookings: 198, revenue: 495000 },
                    { route: "Bangkok → Hat Yai", bookings: 156, revenue: 280800 },
                    { route: "Bangkok → Samui", bookings: 134, revenue: 603000 },
                    { route: "Phuket → Bangkok", bookings: 98, revenue: 313600 }
                  ].map((route, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded">
                          <Plane className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{route.route}</p>
                          <p className="text-xs text-muted-foreground">
                            {route.bookings} bookings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ฿{route.revenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analytics dashboard coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate and download reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Reports section coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}