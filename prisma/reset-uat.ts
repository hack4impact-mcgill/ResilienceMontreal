import "dotenv/config";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function clearAppData() {
  console.log("Clearing UAT app data...");

  const expenseCount = await prisma.expense.deleteMany();
  console.log(`  Deleted ${expenseCount.count} expenses`);

  const grantCount = await prisma.grant.deleteMany();
  console.log(`  Deleted ${grantCount.count} grants`);

  const clientCount = await prisma.client.deleteMany();
  console.log(`  Deleted ${clientCount.count} clients`);

  const poolCount = await prisma.fundPool.deleteMany();
  console.log(`  Deleted ${poolCount.count} fund pools`);

  console.log("  Users preserved (linked to Supabase auth)\n");
}

async function main() {
  await clearAppData();

  console.log("Re-seeding UAT data...\n");
  const result = spawnSync("bun", ["prisma/seed-uat.ts"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main()
  .catch((e) => {
    console.error("UAT reset failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
