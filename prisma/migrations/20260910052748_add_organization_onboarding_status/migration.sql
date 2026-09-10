-- AlterEnum
ALTER TYPE "OrganizationStatus" ADD VALUE 'ONBOARDING';

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "status" SET DEFAULT 'ONBOARDING';
