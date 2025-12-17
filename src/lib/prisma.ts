// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import getPrimaryClient from './db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = (globalForPrisma.prisma || await getPrimaryClient()) as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma