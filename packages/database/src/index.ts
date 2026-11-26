import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __servicegridPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__servicegridPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__servicegridPrisma = prisma;
}

export * from '@prisma/client';
