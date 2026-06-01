-- CreateEnum
CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'INSPECTION_PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HousekeepingTaskType" AS ENUM ('CHECKOUT_CLEANING', 'STAYOVER_CLEANING', 'DEEP_CLEANING', 'INSPECTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "HousekeepingPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "HousekeepingIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "housekeeping_tasks" (
    "id" SERIAL NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "type" "HousekeepingTaskType" NOT NULL DEFAULT 'CHECKOUT_CLEANING',
    "status" "HousekeepingTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "HousekeepingPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToUserId" INTEGER,
    "assignedByUserId" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedByUserId" INTEGER,
    "inspectedByUserId" INTEGER,
    "approvedByUserId" INTEGER,
    "rejectedByUserId" INTEGER,
    "cancelledByUserId" INTEGER,
    "notes" TEXT,
    "completionNotes" TEXT,
    "inspectionNotes" TEXT,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "sourceType" TEXT,
    "sourceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

