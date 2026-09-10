
-- DropIndex
DROP INDEX "Subscription_organizationId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

