-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "deliveryNotes" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "expectedDeliveryDate" DATETIME;
ALTER TABLE "PurchaseOrder" ADD COLUMN "qualityScore" INTEGER;
