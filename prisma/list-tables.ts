import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main(){
  const res: any = await prisma.$queryRaw`select tablename from pg_tables where schemaname='public'`;
  console.log(res);
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e); prisma.$disconnect(); process.exit(1);});
