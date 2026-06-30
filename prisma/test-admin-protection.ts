import "dotenv/config";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing admin protection logic...\n");

  // Count current admins
  const adminCount = await prisma.user.count({
    where: { role: "Admin" },
  });

  console.log(`Current admin count: ${adminCount}`);

  if (adminCount === 0) {
    console.log("No admins found! Create one first with:");
    console.log("   npx tsx prisma/create-admin.ts your-email@example.com");
    process.exit(1);
  }

  if (adminCount === 1) {
    const admin = await prisma.user.findFirst({
      where: { role: "Admin" },
    });
    console.log(`\n Only 1 admin exists: ${admin?.email || "Unknown"}`);
    console.log(
      "   Attempting to demote this admin would be blocked by the protection logic.",
    );
  } else {
    console.log(`\n${adminCount} admins exist - safe to demote one.`);
  }

  // List all users with their roles
  const users = await prisma.user.findMany();

  console.log("\nAll users:");
  console.table(users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
