import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ message: "No session to refresh" }, { status: 200 })
    }

    // Force the client to re-authenticate
    const response = NextResponse.json({ 
      message: "Please sign in again to refresh your session",
      requiresAuth: true 
    }, { status: 401 })

    // Clear the session cookies
    response.cookies.set('next-auth.session-token', '', { maxAge: 0 })
    response.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0 })
    response.cookies.set('next-auth.csrf-token', '', { maxAge: 0 })
    response.cookies.set('__Secure-next-auth.csrf-token', '', { maxAge: 0 })

    return response
  } catch (error) {
    console.error("Error refreshing session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}