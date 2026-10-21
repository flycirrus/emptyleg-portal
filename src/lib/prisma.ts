import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  // Keep the pool small. On Vercel every warm serverless instance keeps its
  // OWN pool, so a large `max` here multiplies across instances and quickly
  // exhausts Postgres' connection limit under load (e.g. a login-flooding
  // bot) — which is what makes the admin dashboard hang on its spinner.
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Reuse a single client across invocations in ALL environments. Previously the
// client was cached only outside production, so in prod every serverless
// instance built a fresh pool and leaked connections under load.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
