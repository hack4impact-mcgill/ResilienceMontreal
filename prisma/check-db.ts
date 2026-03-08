import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    "Role enum values: Unassigned, Bookkeeper, InterventionTeam, Admin\n",
  );

  const users = await prisma.user.findMany();
  console.log("Users:");
  console.table(
    users.map((u) => ({
      supabaseId: u.supabaseId,
      email: u.email,
      name: u.name,
      role: u.role,
      isConfirmed: u.isConfirmed,
    })),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
