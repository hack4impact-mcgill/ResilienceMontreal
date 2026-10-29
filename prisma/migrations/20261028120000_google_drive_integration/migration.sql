CREATE TABLE "GoogleDriveIntegration" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accountEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleDriveIntegration_pkey" PRIMARY KEY ("id")
);
