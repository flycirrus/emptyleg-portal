import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env variables so DATABASE_URL is available
config({ path: resolve(process.cwd(), ".env") });

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create or update markus@gmail.com (ADMIN)
  const markusHash = await bcrypt.hash('Admin123', 10);
  await prisma.user.upsert({
    where: { email: 'markus@gmail.com' },
    update: { 
      passwordHash: markusHash, 
      role: 'ADMIN',
      name: 'Markus'
    },
    create: { 
      email: 'markus@gmail.com', 
      name: 'Markus', 
      passwordHash: markusHash, 
      role: 'ADMIN' 
    }
  });

  // Create or update user1@gmail.com (BROKER - normal user)
  const user1Hash = await bcrypt.hash('Admin123', 10);
  await prisma.user.upsert({
    where: { email: 'user1@gmail.com' },
    update: { 
      passwordHash: user1Hash, 
      role: 'BROKER',
      name: 'User 1'
    },
    create: { 
      email: 'user1@gmail.com', 
      name: 'User 1', 
      passwordHash: user1Hash, 
      role: 'BROKER' 
    }
  });

  console.log('✅ Users markus@gmail.com and user1@gmail.com created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
