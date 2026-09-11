import "dotenv/config";
import { Prisma, PrismaClient, RoleName } from "~/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type UatPersona = {
  email: string;
  name: string;
  role: RoleName;
  supabaseIdEnv: string;
};

const PERSONAS: UatPersona[] = [
  {
    email: process.env.UAT_ADMIN_EMAIL ?? "uat-admin@resiliencemtl.test",
    name: "UAT Admin",
    role: "Admin",
    supabaseIdEnv: "UAT_ADMIN_SUPABASE_ID",
  },
  {
    email:
      process.env.UAT_BOOKKEEPER_EMAIL ?? "uat-bookkeeper@resiliencemtl.test",
    name: "UAT Bookkeeper",
    role: "Bookkeeper",
    supabaseIdEnv: "UAT_BOOKKEEPER_SUPABASE_ID",
  },
  {
    email: process.env.UAT_WORKER_EMAIL ?? "uat-worker@resiliencemtl.test",
    name: "UAT Worker",
    role: "InterventionTeam",
    supabaseIdEnv: "UAT_WORKER_SUPABASE_ID",
  },
];

function requireSupabaseId(persona: UatPersona): string {
  const id = process.env[persona.supabaseIdEnv];
  if (!id) {
    throw new Error(
      `Missing ${persona.supabaseIdEnv}. Create the Supabase auth user for ${persona.email}, then set their UUID in .env before seeding.`,
    );
  }
  return id;
}

async function upsertUsers() {
  const users = [];

  for (const persona of PERSONAS) {
    const supabaseId = requireSupabaseId(persona);
    const user = await prisma.user.upsert({
      where: { email: persona.email },
      update: {
        name: persona.name,
        role: persona.role,
        supabaseId,
        isConfirmed: true,
      },
      create: {
        email: persona.email,
        name: persona.name,
        role: persona.role,
        supabaseId,
        isConfirmed: true,
      },
    });
    users.push(user);
    console.log(`  User: ${user.email} (${user.role})`);
  }

  return users;
}

async function seedFundPools() {
  const pools = [
    { category: "Housing", amount: new Prisma.Decimal(50000), order: 0 },
    { category: "Emergency", amount: new Prisma.Decimal(25000), order: 1 },
    { category: "Admin", amount: new Prisma.Decimal(10000), order: 2 },
    { category: "Wellness", amount: new Prisma.Decimal(15000), order: 3 },
  ];

  const created = [];
  for (const pool of pools) {
    const row = await prisma.fundPool.upsert({
      where: { category: pool.category },
      update: { amount: pool.amount, order: pool.order },
      create: pool,
    });
    created.push(row);
    console.log(`  Fund pool: ${row.category} ($${row.amount})`);
  }

  return created;
}

function grantDescription(notes: string, category: string) {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 6);
  return JSON.stringify({
    notes,
    category,
    dateReceived: now.toISOString(),
    toBeUsedBy: end.toISOString(),
    email: null,
    phoneNumber: null,
  });
}

async function seedGrants(fundPools: { id: number; category: string }[]) {
  const housing = fundPools.find((p) => p.category === "Housing")!;
  const emergency = fundPools.find((p) => p.category === "Emergency")!;
  const admin = fundPools.find((p) => p.category === "Admin")!;

  const grantDefs = [
    {
      title: "City Housing Initiative",
      description: grantDescription("Annual housing support grant", "Housing"),
      totalAmount: new Prisma.Decimal(20000),
      status: "APPROVED" as const,
      fundPoolId: housing.id,
    },
    {
      title: "Emergency Relief Fund",
      description: grantDescription(
        "Rapid response for urgent needs",
        "Emergency",
      ),
      totalAmount: new Prisma.Decimal(12000),
      status: "APPROVED" as const,
      fundPoolId: emergency.id,
    },
    {
      title: "Community Foundation Grant",
      description: grantDescription(
        "Pending approval for Q3 programs",
        "Admin",
      ),
      totalAmount: new Prisma.Decimal(8000),
      status: "PENDING" as const,
      fundPoolId: admin.id,
    },
    {
      title: "Provincial Wellness Program",
      description: grantDescription(
        "Mental health and wellness support",
        "Wellness",
      ),
      totalAmount: new Prisma.Decimal(15000),
      status: "APPROVED" as const,
      fundPoolId: fundPools.find((p) => p.category === "Wellness")!.id,
    },
  ];

  const grants = [];

  for (const def of grantDefs) {
    const existing = await prisma.grant.findFirst({
      where: { title: def.title },
    });
    if (existing) {
      grants.push(existing);
      console.log(`  Grant (existing): ${existing.title}`);
      continue;
    }

    const grant = await prisma.$transaction(async (tx) => {
      const created = await tx.grant.create({
        data: {
          title: def.title,
          description: def.description,
          totalAmount: def.totalAmount,
          unassignedAmount: def.totalAmount,
          status: def.status,
          endDate: new Date(JSON.parse(def.description).toBeUsedBy),
        },
      });

      await tx.grantDistribution.create({
        data: {
          grantId: created.id,
          fundPoolId: def.fundPoolId,
          amount: def.totalAmount,
        },
      });

      await tx.fundPool.update({
        where: { id: def.fundPoolId },
        data: {
          amount: { increment: def.totalAmount },
        },
      });

      return created;
    });

    grants.push(grant);
    console.log(`  Grant: ${grant.title} (${def.status})`);
  }

  return grants;
}

async function seedClients(workerSupabaseId: string) {
  const clients = [
    {
      firstName: "Marie",
      lastName: "Tremblay",
      dateOfBirth: new Date("1985-03-15"),
      email: "marie.tremblay@example.test",
      phone: "514-555-0101",
      landlordName: "Gestion Immo MTL",
      leaseStart: new Date("2024-01-01"),
      leaseEnd: new Date("2025-12-31"),
    },
    {
      firstName: "Jean",
      lastName: "Dupont",
      dateOfBirth: new Date("1978-07-22"),
      email: "jean.dupont@example.test",
      phone: "514-555-0102",
      landlordName: "Proprio Plus",
      leaseStart: new Date("2023-06-01"),
      leaseEnd: new Date("2025-05-31"),
    },
    {
      firstName: "Aisha",
      lastName: "Mohamed",
      dateOfBirth: new Date("1992-11-08"),
      email: "aisha.mohamed@example.test",
      phone: "514-555-0103",
      landlordName: null,
      leaseStart: new Date("2024-09-01"),
      leaseEnd: new Date("2026-08-31"),
    },
    {
      firstName: "Carlos",
      lastName: "Rivera",
      dateOfBirth: new Date("1980-01-30"),
      email: "carlos.rivera@example.test",
      phone: "514-555-0104",
      landlordName: "Habitation St-Laurent",
      leaseStart: new Date("2024-03-01"),
      leaseEnd: new Date("2025-02-28"),
    },
    {
      firstName: "Sophie",
      lastName: "Martin",
      dateOfBirth: new Date("1995-05-12"),
      email: "sophie.martin@example.test",
      phone: "514-555-0105",
      landlordName: "Logis Abordable",
      leaseStart: new Date("2025-01-01"),
      leaseEnd: new Date("2025-12-31"),
    },
    {
      firstName: "David",
      lastName: "Chen",
      dateOfBirth: new Date("1988-09-03"),
      email: "david.chen@example.test",
      phone: "514-555-0106",
      landlordName: null,
      leaseStart: null,
      leaseEnd: null,
    },
    {
      firstName: "Fatima",
      lastName: "Benali",
      dateOfBirth: new Date("1975-12-20"),
      email: "fatima.benali@example.test",
      phone: "514-555-0107",
      landlordName: "Gestion Plateau",
      leaseStart: new Date("2023-01-01"),
      leaseEnd: new Date("2025-06-30"),
    },
    {
      firstName: "Lucas",
      lastName: "Gagnon",
      dateOfBirth: new Date("1990-04-18"),
      email: "lucas.gagnon@example.test",
      phone: "514-555-0108",
      landlordName: "Immeubles du Nord",
      leaseStart: new Date("2024-07-01"),
      leaseEnd: new Date("2026-06-30"),
    },
    {
      firstName: "Elena",
      lastName: "Vasquez",
      dateOfBirth: new Date("1983-08-25"),
      email: "elena.vasquez@example.test",
      phone: "514-555-0109",
      landlordName: null,
      leaseStart: new Date("2025-02-01"),
      leaseEnd: new Date("2026-01-31"),
    },
    {
      firstName: "Thomas",
      lastName: "Roy",
      dateOfBirth: new Date("1972-02-14"),
      email: "thomas.roy@example.test",
      phone: "514-555-0110",
      landlordName: "Coop Habitation",
      leaseStart: new Date("2022-11-01"),
      leaseEnd: new Date("2025-10-31"),
    },
  ];

  let created = 0;
  for (const client of clients) {
    const existing = await prisma.client.findUnique({
      where: { email: client.email },
    });
    if (existing) continue;

    await prisma.client.create({
      data: { ...client, workerId: workerSupabaseId },
    });
    created++;
  }

  console.log(
    `  Clients: ${created} created (${clients.length} total defined)`,
  );
}

async function seedExpenses() {
  const distributions = await prisma.grantDistribution.findMany({
    include: { grant: true },
    take: 3,
  });

  if (distributions.length === 0) {
    console.log("  Expenses: skipped (no grant distributions)");
    return;
  }

  const expenseDefs = [
    {
      description: "First month rent subsidy",
      totalAmount: new Prisma.Decimal(1500),
      allocationFraction: 0.5,
    },
    {
      description: "Emergency grocery support",
      totalAmount: new Prisma.Decimal(350),
      allocationFraction: 0.25,
    },
    {
      description: "Utility bill payment",
      totalAmount: new Prisma.Decimal(200),
      allocationFraction: 0.15,
    },
    {
      description: "Furniture for new apartment",
      totalAmount: new Prisma.Decimal(800),
      allocationFraction: 0.3,
    },
  ];

  let created = 0;
  for (let i = 0; i < expenseDefs.length; i++) {
    const def = expenseDefs[i];
    const dist = distributions[i % distributions.length];
    const allocationAmount = def.totalAmount;

    const existing = await prisma.expense.findFirst({
      where: { description: def.description },
    });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          totalAmount: def.totalAmount,
          description: def.description,
          date: new Date(),
        },
      });

      await tx.expenseDistribution.create({
        data: {
          expenseId: expense.id,
          grantDistributionId: dist.id,
          amount: allocationAmount,
        },
      });

      await tx.grantDistribution.update({
        where: { id: dist.id },
        data: { spentAmount: { increment: allocationAmount } },
      });
    });

    created++;
  }

  console.log(`  Expenses: ${created} created`);
}

async function main() {
  console.log("Seeding UAT database...\n");

  console.log("Users:");
  const users = await upsertUsers();
  const worker = users.find((u) => u.role === "InterventionTeam");
  if (!worker) throw new Error("Worker user not found after upsert");

  console.log("\nFund pools:");
  const fundPools = await seedFundPools();

  console.log("\nGrants:");
  await seedGrants(fundPools);

  console.log("\nClients:");
  await seedClients(worker.supabaseId);

  console.log("\nExpenses:");
  await seedExpenses();

  console.log("\nUAT seed complete.");
}

main()
  .catch((e) => {
    console.error("UAT seed failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
