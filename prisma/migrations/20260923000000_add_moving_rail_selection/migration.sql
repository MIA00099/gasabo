ALTER TABLE "Product" ADD COLUMN "isMovingRail" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Product_status_isMovingRail_createdAt_idx" ON "Product"("status", "isMovingRail", "createdAt");
