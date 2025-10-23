// src/lib/prisma.ts
import getPrimaryClient from './db'

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

export const prisma = globalForPrisma.prisma ?? getPrimaryClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma