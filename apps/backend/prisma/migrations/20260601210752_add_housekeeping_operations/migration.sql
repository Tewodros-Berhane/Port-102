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

-- CreateTable
CREATE TABLE "housekeeping_issues" (
    "id" SERIAL NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "taskId" INTEGER,
    "roomId" INTEGER NOT NULL,
    "reportedByUserId" INTEGER,
    "status" "HousekeepingIssueStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "housekeeping_tasks_taskNumber_key" ON "housekeeping_tasks"("taskNumber");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_roomId_idx" ON "housekeeping_tasks"("roomId");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_status_idx" ON "housekeeping_tasks"("status");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_priority_idx" ON "housekeeping_tasks"("priority");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_assignedToUserId_idx" ON "housekeeping_tasks"("assignedToUserId");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_type_idx" ON "housekeeping_tasks"("type");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_createdAt_idx" ON "housekeeping_tasks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "housekeeping_issues_issueNumber_key" ON "housekeeping_issues"("issueNumber");

-- CreateIndex
CREATE INDEX "housekeeping_issues_taskId_idx" ON "housekeeping_issues"("taskId");
