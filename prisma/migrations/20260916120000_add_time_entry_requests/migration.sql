CREATE TYPE "TimeRequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "TimeEntryRequest" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "TimeRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "timeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryRequest_timeEntryId_key" ON "TimeEntryRequest"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryRequest_taskId_idx" ON "TimeEntryRequest"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntryRequest_userId_idx" ON "TimeEntryRequest"("userId");

-- CreateIndex
CREATE INDEX "TimeEntryRequest_status_idx" ON "TimeEntryRequest"("status");

-- AddForeignKey
ALTER TABLE "TimeEntryRequest" ADD CONSTRAINT "TimeEntryRequest_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryRequest" ADD CONSTRAINT "TimeEntryRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryRequest" ADD CONSTRAINT "TimeEntryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

