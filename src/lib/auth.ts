import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            organization: true
          }
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as any).role
        token.organizationId = (user as any).organizationId
        token.organizationName = (user as any).organizationName
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        // If we have a token ID, use it
        if (token.id) {
          session.user.id = token.id as string
          session.user.role = token.role as string
          session.user.organizationId = token.organizationId as string
          session.user.organizationName = token.organizationName as string

          // If organizationId is missing from token, fetch it from DB
          if (!token.organizationId && token.email) {
            const user = await prisma.user.findUnique({
              where: { email: token.email as string },
              include: {
                organization: true
              }
            })
            if (user && user.organization) {
              session.user.organizationId = user.organizationId
              session.user.organizationName = user.organization.name
            }
          }
        }
        // If we have an email but no ID, try to find the user
        else if (token.email) {
          const user = await prisma.user.findUnique({
            where: { email: token.email as string },
            include: {
              organization: true
            }
          })
          if (user) {
            session.user.id = user.id
            session.user.role = user.role
            session.user.organizationId = user.organizationId
            session.user.organizationName = user.organization?.name || 'Unknown'
          }
        }
      }
      return session
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  debug: process.env.NODE_ENV === "development"
}