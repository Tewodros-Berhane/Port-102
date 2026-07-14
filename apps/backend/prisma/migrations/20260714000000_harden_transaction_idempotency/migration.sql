-- Prevent duplicate folio postings for a single external source such as a POS order.
CREATE UNIQUE INDEX "folio_line_items_sourceType_sourceId_key"
ON "folio_line_items"("sourceType", "sourceId");

-- A checkout may create one cleaning task per room, but never duplicate that task.
CREATE UNIQUE INDEX "housekeeping_tasks_roomId_sourceType_sourceId_key"
ON "housekeeping_tasks"("roomId", "sourceType", "sourceId");

-- A housekeeping issue may have at most one non-final maintenance ticket.
CREATE UNIQUE INDEX "maintenance_tickets_active_housekeeping_source_key"
ON "maintenance_tickets"("sourceType", "sourceId")
WHERE "sourceType" = 'HOUSEKEEPING_ISSUE'
  AND "status" NOT IN ('APPROVED', 'CANCELLED');

-- A purchase request may be converted into at most one purchase order.
CREATE UNIQUE INDEX "purchase_orders_purchaseRequestId_key"
ON "purchase_orders"("purchaseRequestId");
