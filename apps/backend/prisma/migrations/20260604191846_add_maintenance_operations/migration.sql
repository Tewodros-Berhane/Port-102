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

