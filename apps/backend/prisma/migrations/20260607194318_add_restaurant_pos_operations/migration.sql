-- CreateEnum
CREATE TYPE "OutletType" AS ENUM ('RESTAURANT', 'CAFE', 'BAR', 'STORE', 'ROOM_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "PosOrderStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PosOrderPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'CHARGED_TO_ROOM', 'VOIDED');

-- CreateEnum
CREATE TYPE "PosOrderSource" AS ENUM ('WALK_IN', 'TABLE_SERVICE', 'ROOM_SERVICE', 'MANUAL');

-- CreateEnum
CREATE TYPE "MenuItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'QR_PAYMENT', 'ROOM_CHARGE', 'OTHER');

-- CreateTable
CREATE TABLE "outlets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OutletType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "MenuItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_orders" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "outletId" INTEGER NOT NULL,
    "status" "PosOrderStatus" NOT NULL DEFAULT 'OPEN',
    "paymentStatus" "PosOrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "source" "PosOrderSource" NOT NULL DEFAULT 'MANUAL',
    "tableNumber" TEXT,
    "roomId" INTEGER,
    "stayId" INTEGER,
    "folioId" INTEGER,
    "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancelledReason" TEXT,
    "createdByUserId" INTEGER,
    "closedByUserId" INTEGER,
    "cancelledByUserId" INTEGER,
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_order_payments" (
    "id" SERIAL NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PosPaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedByUserId" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outlets_code_key" ON "outlets"("code");

-- CreateIndex
CREATE INDEX "outlets_type_idx" ON "outlets"("type");

-- CreateIndex
CREATE INDEX "outlets_isActive_idx" ON "outlets"("isActive");

-- CreateIndex
CREATE INDEX "menu_items_outletId_idx" ON "menu_items"("outletId");

-- CreateIndex
CREATE INDEX "menu_items_status_idx" ON "menu_items"("status");

-- CreateIndex
CREATE INDEX "menu_items_category_idx" ON "menu_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_outletId_code_key" ON "menu_items"("outletId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "pos_orders_orderNumber_key" ON "pos_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "pos_orders_outletId_idx" ON "pos_orders"("outletId");

-- CreateIndex
CREATE INDEX "pos_orders_status_idx" ON "pos_orders"("status");

-- CreateIndex
CREATE INDEX "pos_orders_paymentStatus_idx" ON "pos_orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "pos_orders_source_idx" ON "pos_orders"("source");

-- CreateIndex
CREATE INDEX "pos_orders_roomId_idx" ON "pos_orders"("roomId");

-- CreateIndex
CREATE INDEX "pos_orders_stayId_idx" ON "pos_orders"("stayId");

-- CreateIndex
CREATE INDEX "pos_orders_folioId_idx" ON "pos_orders"("folioId");

-- CreateIndex
CREATE INDEX "pos_orders_createdAt_idx" ON "pos_orders"("createdAt");

-- CreateIndex
CREATE INDEX "pos_order_items_orderId_idx" ON "pos_order_items"("orderId");

-- CreateIndex
CREATE INDEX "pos_order_items_menuItemId_idx" ON "pos_order_items"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_order_payments_paymentNumber_key" ON "pos_order_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "pos_order_payments_orderId_idx" ON "pos_order_payments"("orderId");

-- CreateIndex
CREATE INDEX "pos_order_payments_method_idx" ON "pos_order_payments"("method");

-- CreateIndex
CREATE INDEX "pos_order_payments_recordedAt_idx" ON "pos_order_payments"("recordedAt");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "stays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "folios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pos_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order_payments" ADD CONSTRAINT "pos_order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pos_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order_payments" ADD CONSTRAINT "pos_order_payments_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
