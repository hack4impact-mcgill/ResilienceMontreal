import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.argv[2];
  
  if (!adminEmail) {
    console.error("Please provide an email address:");
    console.log("   npx tsx prisma/create-admin.ts your-email@example.com");
    process.exit(1);
  }

  // Find the Admin role
  const adminRole = await prisma.role.findUnique({
    where: { name: "Admin" },
  });

  if (!adminRole) {
    console.error("Admin role not found in database");
    process.exit(1);
  }

  // Update user to have Admin role
  const user = await prisma.user.update({
    where: { email: adminEmail },
    data: { roleId: adminRole.id },
    include: { role: true },
  });

  console.log("User promoted to Admin:");
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Role: ${user.role?.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
