import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user being updated
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { organizationId: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Determine if user is super admin
    const defaultOrg = await prisma.organization.findUnique({
      where: { code: 'DEFAULT' },
      select: { id: true }
    })
    const isSuperAdmin = session.user.organizationId === defaultOrg?.id

    // Access control: org admins can only update users in their own organization
    if (!isSuperAdmin && existingUser.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: "You can only update users in your own organization" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, role, email, password, organizationId } = body

    const updateData: any = {}

    if (name) updateData.name = name
    if (role) updateData.role = role
    if (email) updateData.email = email
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Only allow organization change if super admin
    if (organizationId) {
      if (!isSuperAdmin && organizationId !== session.user.organizationId) {
        return NextResponse.json(
          { error: "You can only assign users to your own organization" },
          { status: 403 }
        )
      }
      updateData.organizationId = organizationId
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        updatedAt: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prevent deleting own account
    if (params.id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Get the user being deleted
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { organizationId: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Determine if user is super admin
    const defaultOrg = await prisma.organization.findUnique({
      where: { code: 'DEFAULT' },
      select: { id: true }
    })
    const isSuperAdmin = session.user.organizationId === defaultOrg?.id

    // Access control: org admins can only delete users in their own organization
    if (!isSuperAdmin && existingUser.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: "You can only delete users in your own organization" },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}