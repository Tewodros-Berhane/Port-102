CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'TASK', 'APPROVAL', 'OPERATIONAL_ALERT');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

ALTER TABLE "hotels"
  ALTER COLUMN "id" SET DEFAULT 1,
  ALTER COLUMN "code" DROP NOT NULL,
  ALTER COLUMN "timezone" SET DEFAULT 'Africa/Addis_Ababa',
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "taxIdentification" TEXT,
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "alternatePhone" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Ethiopia',
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en-ET',
  ADD COLUMN "checkInTime" TEXT,
  ADD COLUMN "checkOutTime" TEXT,
  ADD COLUMN "receiptFooter" TEXT,
  ADD COLUMN "invoiceFooter" TEXT,
  ADD COLUMN "defaultTaxRate" DECIMAL(5,2),
  ADD COLUMN "defaultServiceChargeRate" DECIMAL(5,2);

CREATE TABLE "notifications" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "actionUrl" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
