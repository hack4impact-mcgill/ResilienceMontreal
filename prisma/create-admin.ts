import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.argv[2];

  if (!adminEmail) {
    console.error("Please provide an email address:");
    console.log("   npx tsx prisma/create-admin.ts your-email@example.com");
    process.exit(1);
  }

  // Update user to have Admin role
  const user = await prisma.user.update({
    where: { email: adminEmail },
    data: { role: "Admin" },
  });

  console.log("User promoted to Admin:");
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
