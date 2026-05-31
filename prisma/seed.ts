import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "renaldofly@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Renaldo",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.pricingConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      shortFlightThresholdNm: 400,
      shortFlightMultiplier: 18.9,
      longFlightMultiplier: 8.5,
      minimumPrice: 1700,
      roundToNearest: 100,
    },
  });

  // Default country surcharges
  await prisma.countrySurcharge.upsert({
    where: { countryCode_label_appliesTo: { countryCode: "IT", label: "Italian Luxury Tax", appliesTo: "BOTH" } },
    update: {},
    create: {
      countryCode: "IT",
      countryName: "Italy",
      surchargeType: "FIXED",
      amount: 250,
      label: "Italian Luxury Tax",
      appliesTo: "BOTH",
      isActive: true,
    },
  });

  await prisma.countrySurcharge.upsert({
    where: { countryCode_label_appliesTo: { countryCode: "FR", label: "French Aviation Tax", appliesTo: "BOTH" } },
    update: {},
    create: {
      countryCode: "FR",
      countryName: "France",
      surchargeType: "FIXED",
      amount: 200,
      label: "French Aviation Tax",
      appliesTo: "BOTH",
      isActive: true,
    },
  });

  console.log("Seed completed: Admin user, pricing config, and surcharges created.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
