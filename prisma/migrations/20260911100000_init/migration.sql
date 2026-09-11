-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('Unassigned', 'Bookkeeper', 'InterventionTeam', 'Admin');

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "workerId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "landlordName" TEXT,
    "leaseStart" TIMESTAMP(3),
    "leaseEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceUrl" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseDistribution" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "grantDistributionId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ExpenseDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundPool" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FundPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grant" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "unassignedAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "Status" NOT NULL DEFAULT 'APPROVED',

    CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantDistribution" (
    "id" SERIAL NOT NULL,
    "grantId" INTEGER NOT NULL,
    "fundPoolId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "spentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "GrantDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "supabaseId" TEXT NOT NULL,
    "role" "RoleName" NOT NULL DEFAULT 'Unassigned',

    CONSTRAINT "User_pkey" PRIMARY KEY ("supabaseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "ExpenseDistribution_grantDistributionId_idx" ON "ExpenseDistribution"("grantDistributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseDistribution_expenseId_grantDistributionId_key" ON "ExpenseDistribution"("expenseId", "grantDistributionId");

-- CreateIndex
CREATE UNIQUE INDEX "FundPool_category_key" ON "FundPool"("category");

-- CreateIndex
CREATE INDEX "Grant_createdAt_idx" ON "Grant"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Grant_totalAmount_idx" ON "Grant"("totalAmount");

-- CreateIndex
CREATE INDEX "Grant_endDate_idx" ON "Grant"("endDate");

-- CreateIndex
CREATE INDEX "Grant_status_idx" ON "Grant"("status");

-- CreateIndex
CREATE INDEX "Grant_title_idx" ON "Grant"("title");

-- CreateIndex
CREATE INDEX "GrantDistribution_grantId_idx" ON "GrantDistribution"("grantId");

-- CreateIndex
CREATE INDEX "GrantDistribution_fundPoolId_idx" ON "GrantDistribution"("fundPoolId");

-- CreateIndex
CREATE UNIQUE INDEX "GrantDistribution_grantId_fundPoolId_key" ON "GrantDistribution"("grantId", "fundPoolId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("supabaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseDistribution" ADD CONSTRAINT "ExpenseDistribution_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseDistribution" ADD CONSTRAINT "ExpenseDistribution_grantDistributionId_fkey" FOREIGN KEY ("grantDistributionId") REFERENCES "GrantDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantDistribution" ADD CONSTRAINT "GrantDistribution_fundPoolId_fkey" FOREIGN KEY ("fundPoolId") REFERENCES "FundPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantDistribution" ADD CONSTRAINT "GrantDistribution_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

