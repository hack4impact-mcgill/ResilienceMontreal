import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(){
  const roles = await prisma.role.findMany();
  console.log('Roles:');
  console.table(roles);

  const users = await prisma.user.findMany({ include: { role: true } });
  console.log('\nUsers:');
  console.table(users.map(u => ({ id: u.id, email: u.email, name: u.name, roleId: u.roleId, role: u.role?.name }))); 

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
