
-- CreateEnum
CREATE TYPE "QuoteRequestSource" AS ENUM ('FORM', 'CALL');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'RESOLVED');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationToken" TEXT,
ADD COLUMN     "verificationTokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "organizationId" DROP NOT NULL,
ALTER COLUMN "roleId" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "notes" TEXT,
    "contactPhone" TEXT,
    "source" "QuoteRequestSource" NOT NULL,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequest_organizationId_idx" ON "QuoteRequest"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

