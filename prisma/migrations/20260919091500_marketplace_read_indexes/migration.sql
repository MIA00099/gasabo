-- Additive performance indexes only. No table, column, or row is removed or rewritten.
CREATE INDEX IF NOT EXISTS "Product_status_isFeatured_isTrending_createdAt_idx" ON "Product"("status", "isFeatured", "isTrending", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_status_categoryId_createdAt_idx" ON "Product"("status", "categoryId", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_status_district_createdAt_idx" ON "Product"("status", "district", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_sellerId_createdAt_idx" ON "Product"("sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_status_flashDealEndsAt_idx" ON "Product"("status", "flashDealEndsAt");
