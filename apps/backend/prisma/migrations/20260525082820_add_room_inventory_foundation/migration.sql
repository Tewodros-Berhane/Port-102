-- CreateEnum
CREATE TYPE "RoomOccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "RoomCleaningStatus" AS ENUM ('CLEAN', 'DIRTY', 'INSPECTED');

-- CreateEnum
CREATE TYPE "RoomMaintenanceStatus" AS ENUM ('AVAILABLE', 'OUT_OF_ORDER', 'OUT_OF_SERVICE', 'UNDER_MAINTENANCE');

-- CreateTable
CREATE TABLE "floors" (
    "id" SERIAL NOT NULL,
    "number" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "baseOccupancy" INTEGER NOT NULL DEFAULT 1,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 1,
    "baseRate" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_amenities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "roomTypeId" INTEGER NOT NULL,
    "amenityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("roomTypeId","amenityId")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "displayName" TEXT,
    "floorId" INTEGER,
    "roomTypeId" INTEGER NOT NULL,
    "occupancyStatus" "RoomOccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "cleaningStatus" "RoomCleaningStatus" NOT NULL DEFAULT 'CLEAN',
    "maintenanceStatus" "RoomMaintenanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_status_logs" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "actorUserId" INTEGER,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "floors_isActive_idx" ON "floors"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "floors_name_key" ON "floors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_code_key" ON "room_types"("code");

-- CreateIndex
CREATE INDEX "room_types_isActive_idx" ON "room_types"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "room_amenities_key_key" ON "room_amenities"("key");

-- CreateIndex
CREATE INDEX "room_amenities_isActive_idx" ON "room_amenities"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_roomNumber_key" ON "rooms"("roomNumber");

-- CreateIndex
CREATE INDEX "rooms_floorId_idx" ON "rooms"("floorId");

-- CreateIndex
CREATE INDEX "rooms_roomTypeId_idx" ON "rooms"("roomTypeId");

-- CreateIndex
CREATE INDEX "rooms_isActive_idx" ON "rooms"("isActive");

-- CreateIndex
CREATE INDEX "rooms_occupancyStatus_idx" ON "rooms"("occupancyStatus");

-- CreateIndex
CREATE INDEX "rooms_cleaningStatus_idx" ON "rooms"("cleaningStatus");

-- CreateIndex
CREATE INDEX "rooms_maintenanceStatus_idx" ON "rooms"("maintenanceStatus");

-- CreateIndex
CREATE INDEX "room_status_logs_roomId_createdAt_idx" ON "room_status_logs"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "room_status_logs_actorUserId_idx" ON "room_status_logs"("actorUserId");

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "room_amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_status_logs" ADD CONSTRAINT "room_status_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_status_logs" ADD CONSTRAINT "room_status_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
