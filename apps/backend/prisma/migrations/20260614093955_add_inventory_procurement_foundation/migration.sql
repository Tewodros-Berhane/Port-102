-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('FOOD', 'BEVERAGE', 'HOUSEKEEPING_SUPPLY', 'LINEN', 'ROOM_AMENITY', 'CLEANING_SUPPLY', 'MAINTENANCE_PART', 'OFFICE_SUPPLY', 'STORE_PRODUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'POS_CONSUMPTION', 'WASTE', 'RETURN');

-- CreateEnum
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONVERTED_TO_PO');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoodsReceivedStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InventoryItemType" NOT NULL,
    "category" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "reorderLevel" DECIMAL(12,2),
    "reorderQuantity" DECIMAL(12,2),
    "averageCost" DECIMAL(12,2),
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "movementNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "fromLocationId" INTEGER,
    "toLocationId" INTEGER,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "referenceType" TEXT,
    "referenceId" INTEGER,
    "reason" TEXT,
    "notes" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" SERIAL NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedByUserId" INTEGER,
    "approvedByUserId" INTEGER,
    "rejectedByUserId" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "supplierNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" SERIAL NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "departmentId" INTEGER,
    "requestedByUserId" INTEGER,
    "approvedByUserId" INTEGER,
    "rejectedByUserId" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT,
    "decisionNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_items" (
    "id" SERIAL NOT NULL,
    "purchaseRequestId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "estimatedUnitCost" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" INTEGER,
    "purchaseRequestId" INTEGER,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "approvedByUserId" INTEGER,
    "createdByUserId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "receivedQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_received" (
    "id" SERIAL NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "purchaseOrderId" INTEGER,
    "supplierId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "status" "GoodsReceivedStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedByUserId" INTEGER,
    "postedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_received_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_received_items" (
    "id" SERIAL NOT NULL,
    "goodsReceivedId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "goods_received_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_locations_code_key" ON "inventory_locations"("code");

-- CreateIndex
CREATE INDEX "inventory_locations_isActive_idx" ON "inventory_locations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_itemNumber_key" ON "inventory_items"("itemNumber");

-- CreateIndex
CREATE INDEX "inventory_items_type_idx" ON "inventory_items"("type");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "stock_balances_itemId_idx" ON "stock_balances"("itemId");

-- CreateIndex
CREATE INDEX "stock_balances_locationId_idx" ON "stock_balances"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_itemId_locationId_key" ON "stock_balances"("itemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_movementNumber_key" ON "stock_movements"("movementNumber");

-- CreateIndex
CREATE INDEX "stock_movements_itemId_idx" ON "stock_movements"("itemId");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_locationId_idx" ON "stock_movements"("locationId");

-- CreateIndex
CREATE INDEX "stock_movements_fromLocationId_idx" ON "stock_movements"("fromLocationId");

-- CreateIndex
CREATE INDEX "stock_movements_toLocationId_idx" ON "stock_movements"("toLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_adjustmentNumber_key" ON "stock_adjustments"("adjustmentNumber");

-- CreateIndex
CREATE INDEX "stock_adjustments_itemId_idx" ON "stock_adjustments"("itemId");

-- CreateIndex
CREATE INDEX "stock_adjustments_locationId_idx" ON "stock_adjustments"("locationId");

-- CreateIndex
CREATE INDEX "stock_adjustments_status_idx" ON "stock_adjustments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierNumber_key" ON "suppliers"("supplierNumber");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_requestNumber_key" ON "purchase_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "purchase_requests_status_idx" ON "purchase_requests"("status");

-- CreateIndex
CREATE INDEX "purchase_requests_departmentId_idx" ON "purchase_requests"("departmentId");

-- CreateIndex
CREATE INDEX "purchase_requests_requestedByUserId_idx" ON "purchase_requests"("requestedByUserId");

-- CreateIndex
CREATE INDEX "purchase_request_items_purchaseRequestId_idx" ON "purchase_request_items"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "purchase_request_items_itemId_idx" ON "purchase_request_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_purchaseRequestId_idx" ON "purchase_orders"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_items_itemId_idx" ON "purchase_order_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "goods_received_grnNumber_key" ON "goods_received"("grnNumber");

-- CreateIndex
CREATE INDEX "goods_received_purchaseOrderId_idx" ON "goods_received"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "goods_received_supplierId_idx" ON "goods_received"("supplierId");

-- CreateIndex
CREATE INDEX "goods_received_locationId_idx" ON "goods_received"("locationId");

-- CreateIndex
CREATE INDEX "goods_received_status_idx" ON "goods_received"("status");

-- CreateIndex
CREATE INDEX "goods_received_items_goodsReceivedId_idx" ON "goods_received_items"("goodsReceivedId");

-- CreateIndex
CREATE INDEX "goods_received_items_itemId_idx" ON "goods_received_items"("itemId");

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received" ADD CONSTRAINT "goods_received_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received" ADD CONSTRAINT "goods_received_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received" ADD CONSTRAINT "goods_received_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received" ADD CONSTRAINT "goods_received_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_items" ADD CONSTRAINT "goods_received_items_goodsReceivedId_fkey" FOREIGN KEY ("goodsReceivedId") REFERENCES "goods_received"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_items" ADD CONSTRAINT "goods_received_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
