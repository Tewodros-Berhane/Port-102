-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "StayRoomAssignmentStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateTable
CREATE TABLE "stays" (
    "id" SERIAL NOT NULL,
    "stayNumber" TEXT NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "guestId" INTEGER NOT NULL,
    "status" "StayStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedCheckOutDate" TIMESTAMP(3) NOT NULL,
    "checkedOutAt" TIMESTAMP(3),
    "checkedInByUserId" INTEGER,
    "checkedOutByUserId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stay_room_assignments" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "reservationRoomId" INTEGER,
    "status" "StayRoomAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "assignedByUserId" INTEGER,
    "releasedByUserId" INTEGER,
    "reason" TEXT,

    CONSTRAINT "stay_room_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stays_stayNumber_key" ON "stays"("stayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stays_reservationId_key" ON "stays"("reservationId");

-- CreateIndex
CREATE INDEX "stays_guestId_idx" ON "stays"("guestId");

-- CreateIndex
CREATE INDEX "stays_status_idx" ON "stays"("status");

-- CreateIndex
CREATE INDEX "stays_checkedInAt_idx" ON "stays"("checkedInAt");

-- CreateIndex
CREATE INDEX "stays_expectedCheckOutDate_idx" ON "stays"("expectedCheckOutDate");

-- CreateIndex
CREATE INDEX "stay_room_assignments_stayId_idx" ON "stay_room_assignments"("stayId");

-- CreateIndex
CREATE INDEX "stay_room_assignments_roomId_idx" ON "stay_room_assignments"("roomId");

-- CreateIndex
CREATE INDEX "stay_room_assignments_reservationRoomId_idx" ON "stay_room_assignments"("reservationRoomId");

-- CreateIndex
CREATE INDEX "stay_room_assignments_status_idx" ON "stay_room_assignments"("status");

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_checkedInByUserId_fkey" FOREIGN KEY ("checkedInByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_checkedOutByUserId_fkey" FOREIGN KEY ("checkedOutByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_room_assignments" ADD CONSTRAINT "stay_room_assignments_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "stays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_room_assignments" ADD CONSTRAINT "stay_room_assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_room_assignments" ADD CONSTRAINT "stay_room_assignments_reservationRoomId_fkey" FOREIGN KEY ("reservationRoomId") REFERENCES "reservation_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_room_assignments" ADD CONSTRAINT "stay_room_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_room_assignments" ADD CONSTRAINT "stay_room_assignments_releasedByUserId_fkey" FOREIGN KEY ("releasedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
