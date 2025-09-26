/*
  Warnings:

  - A unique constraint covering the columns `[pdfToken]` on the table `IOM` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pdfToken]` on the table `PaymentRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pdfToken]` on the table `PurchaseOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IOM" ADD COLUMN "pdfToken" TEXT;

-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN "pdfToken" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "pdfToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IOM_pdfToken_key" ON "IOM"("pdfToken");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_pdfToken_key" ON "PaymentRequest"("pdfToken");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_pdfToken_key" ON "PurchaseOrder"("pdfToken");
