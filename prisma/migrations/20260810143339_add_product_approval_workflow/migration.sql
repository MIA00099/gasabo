-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "rejectionReason" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
