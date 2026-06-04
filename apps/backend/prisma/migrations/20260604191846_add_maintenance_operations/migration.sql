-- CreateEnum
CREATE TYPE "MaintenanceTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceTicketSource" AS ENUM ('FRONT_DESK', 'HOUSEKEEPING', 'MANAGER', 'TECHNICIAN', 'PREVENTIVE', 'MANUAL');

-- CreateEnum
CREATE TYPE "MaintenanceIssueType" AS ENUM ('ELECTRICAL', 'PLUMBING', 'HVAC', 'FURNITURE', 'APPLIANCE', 'CLEANLINESS', 'STRUCTURAL', 'INTERNET_TV', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "PreventiveMaintenanceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "roomId" INTEGER,
    "assetId" INTEGER,
    "source" "MaintenanceTicketSource" NOT NULL DEFAULT 'MANUAL',
    "sourceType" TEXT,
    "sourceId" INTEGER,
    "issueType" "MaintenanceIssueType" NOT NULL DEFAULT 'OTHER',
    "status" "MaintenanceTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reportedByUserId" INTEGER,
    "assignedToUserId" INTEGER,
    "assignedByUserId" INTEGER,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedByUserId" INTEGER,
    "approvedByUserId" INTEGER,
    "rejectedByUserId" INTEGER,
    "cancelledByUserId" INTEGER,
    "completionNotes" TEXT,
    "approvalNotes" TEXT,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_ticket_notes" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorUserId" INTEGER,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_ticket_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_ticket_photos" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "uploadedByUserId" INTEGER,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_ticket_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "roomId" INTEGER,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenance_plans" (
    "id" SERIAL NOT NULL,
    "planNumber" TEXT NOT NULL,
    "assetId" INTEGER,
    "roomId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PreventiveMaintenanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "intervalDays" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastCompletedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventive_maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_tickets_ticketNumber_key" ON "maintenance_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "maintenance_tickets_roomId_idx" ON "maintenance_tickets"("roomId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_assetId_idx" ON "maintenance_tickets"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets"("status");

-- CreateIndex
CREATE INDEX "maintenance_tickets_priority_idx" ON "maintenance_tickets"("priority");

-- CreateIndex
CREATE INDEX "maintenance_tickets_assignedToUserId_idx" ON "maintenance_tickets"("assignedToUserId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_issueType_idx" ON "maintenance_tickets"("issueType");

-- CreateIndex
CREATE INDEX "maintenance_tickets_createdAt_idx" ON "maintenance_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "maintenance_ticket_notes_ticketId_idx" ON "maintenance_ticket_notes"("ticketId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_notes_authorUserId_idx" ON "maintenance_ticket_notes"("authorUserId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_photos_ticketId_idx" ON "maintenance_ticket_photos"("ticketId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_photos_uploadedByUserId_idx" ON "maintenance_ticket_photos"("uploadedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetNumber_key" ON "assets"("assetNumber");

-- CreateIndex
CREATE INDEX "assets_roomId_idx" ON "assets"("roomId");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE UNIQUE INDEX "preventive_maintenance_plans_planNumber_key" ON "preventive_maintenance_plans"("planNumber");

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_assetId_idx" ON "preventive_maintenance_plans"("assetId");

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_roomId_idx" ON "preventive_maintenance_plans"("roomId");

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_status_idx" ON "preventive_maintenance_plans"("status");

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_nextDueDate_idx" ON "preventive_maintenance_plans"("nextDueDate");

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket_notes" ADD CONSTRAINT "maintenance_ticket_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "maintenance_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket_notes" ADD CONSTRAINT "maintenance_ticket_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket_photos" ADD CONSTRAINT "maintenance_ticket_photos_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "maintenance_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket_photos" ADD CONSTRAINT "maintenance_ticket_photos_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
