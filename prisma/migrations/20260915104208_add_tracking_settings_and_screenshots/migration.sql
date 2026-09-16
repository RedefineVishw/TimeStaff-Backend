-- CreateTable
CREATE TABLE "OrganizationTrackingSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idleThresholdSec" INTEGER NOT NULL DEFAULT 300,
    "screenshotIntervalSec" INTEGER NOT NULL DEFAULT 300,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "OrganizationTrackingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationTrackingSettings_organizationId_key" ON "OrganizationTrackingSettings"("organizationId");

-- CreateIndex
CREATE INDEX "Screenshot_timeEntryId_idx" ON "Screenshot"("timeEntryId");

-- CreateIndex
CREATE INDEX "Screenshot_taskId_idx" ON "Screenshot"("taskId");

-- CreateIndex
CREATE INDEX "Screenshot_userId_idx" ON "Screenshot"("userId");

-- AddForeignKey
ALTER TABLE "OrganizationTrackingSettings" ADD CONSTRAINT "OrganizationTrackingSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
