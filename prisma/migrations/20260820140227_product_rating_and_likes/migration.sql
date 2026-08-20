-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "rating" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProductLike" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLike_productId_idx" ON "ProductLike"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLike_productId_visitorKey_key" ON "ProductLike"("productId", "visitorKey");

-- AddForeignKey
ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
