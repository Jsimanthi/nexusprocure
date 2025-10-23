// src/lib/prisma.ts
import getPrimaryClient from './db'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = (globalForPrisma.prisma || await getPrimaryClient()) as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma