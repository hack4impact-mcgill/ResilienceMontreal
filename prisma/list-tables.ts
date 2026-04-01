import "dotenv/config";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
async function main() {
  const res: any =
    await prisma.$queryRaw`select tablename from pg_tables where schemaname='public'`;
  console.log(res);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
