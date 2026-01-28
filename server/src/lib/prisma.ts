import { Prisma, PrismaClient } from "@prisma/client";

// PrismaClient singleton to prevent multiple instances in development
// This is especially important for serverless environments and hot-reloading

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const logOptions: Prisma.LogLevel[] = process.env.NODE_ENV === "development" 
  ? ["error", "warn"]
  : ["error"];

export const prisma = globalThis.prisma ?? new PrismaClient({ log: logOptions });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Graceful shutdown handling
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
