-- CreateTable
CREATE TABLE "RealEstateInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "propertyId" TEXT,
    "propertyTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealEstateInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealEstateInquiry_status_idx" ON "RealEstateInquiry"("status");
