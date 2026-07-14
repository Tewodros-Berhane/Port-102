CREATE INDEX "reservations_createdAt_idx" ON "reservations"("createdAt");

CREATE INDEX "folio_line_items_postedAt_idx" ON "folio_line_items"("postedAt");

CREATE INDEX "purchase_requests_createdAt_idx" ON "purchase_requests"("createdAt");

CREATE INDEX "purchase_orders_createdAt_idx" ON "purchase_orders"("createdAt");

CREATE INDEX "goods_received_createdAt_idx" ON "goods_received"("createdAt");
