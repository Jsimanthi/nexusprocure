-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prNumber" TEXT NOT NULL,
    "pdfToken" TEXT,
    "poId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "reviewerStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentTo" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "purpose" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CHEQUE',
    "bankAccount" TEXT,
    "referenceNumber" TEXT,
    "preparedById" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "departmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRequest_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentRequest" ("approvedById", "approverStatus", "bankAccount", "createdAt", "currency", "exchangeRate", "grandTotal", "id", "paymentDate", "paymentMethod", "paymentTo", "pdfToken", "poId", "prNumber", "preparedById", "purpose", "referenceNumber", "requestedById", "reviewedById", "reviewerStatus", "status", "taxAmount", "title", "totalAmount", "updatedAt") SELECT "approvedById", "approverStatus", "bankAccount", "createdAt", "currency", "exchangeRate", "grandTotal", "id", "paymentDate", "paymentMethod", "paymentTo", "pdfToken", "poId", "prNumber", "preparedById", "purpose", "referenceNumber", "requestedById", "reviewedById", "reviewerStatus", "status", "taxAmount", "title", "totalAmount", "updatedAt" FROM "PaymentRequest";
DROP TABLE "PaymentRequest";
ALTER TABLE "new_PaymentRequest" RENAME TO "PaymentRequest";
CREATE UNIQUE INDEX "PaymentRequest_prNumber_key" ON "PaymentRequest"("prNumber");
CREATE UNIQUE INDEX "PaymentRequest_pdfToken_key" ON "PaymentRequest"("pdfToken");
CREATE INDEX "PaymentRequest_poId_idx" ON "PaymentRequest"("poId");
CREATE INDEX "PaymentRequest_preparedById_idx" ON "PaymentRequest"("preparedById");
CREATE INDEX "PaymentRequest_requestedById_idx" ON "PaymentRequest"("requestedById");
CREATE INDEX "PaymentRequest_reviewedById_idx" ON "PaymentRequest"("reviewedById");
CREATE INDEX "PaymentRequest_approvedById_idx" ON "PaymentRequest"("approvedById");
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poNumber" TEXT NOT NULL,
    "pdfToken" TEXT,
    "iomId" TEXT,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expectedDeliveryDate" DATETIME,
    "fulfilledAt" DATETIME,
    "qualityScore" INTEGER,
    "deliveryNotes" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "reviewerStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyContact" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorAddress" TEXT NOT NULL,
    "vendorContact" TEXT NOT NULL,
    "preparedById" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "departmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_iomId_fkey" FOREIGN KEY ("iomId") REFERENCES "IOM" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("approvedById", "approverStatus", "companyAddress", "companyContact", "companyName", "createdAt", "currency", "deliveryNotes", "exchangeRate", "expectedDeliveryDate", "fulfilledAt", "grandTotal", "id", "iomId", "pdfToken", "poNumber", "preparedById", "qualityScore", "requestedById", "reviewedById", "reviewerStatus", "status", "taxAmount", "taxRate", "title", "totalAmount", "updatedAt", "vendorAddress", "vendorContact", "vendorId", "vendorName") SELECT "approvedById", "approverStatus", "companyAddress", "companyContact", "companyName", "createdAt", "currency", "deliveryNotes", "exchangeRate", "expectedDeliveryDate", "fulfilledAt", "grandTotal", "id", "iomId", "pdfToken", "poNumber", "preparedById", "qualityScore", "requestedById", "reviewedById", "reviewerStatus", "status", "taxAmount", "taxRate", "title", "totalAmount", "updatedAt", "vendorAddress", "vendorContact", "vendorId", "vendorName" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");
CREATE UNIQUE INDEX "PurchaseOrder_pdfToken_key" ON "PurchaseOrder"("pdfToken");
CREATE INDEX "PurchaseOrder_iomId_idx" ON "PurchaseOrder"("iomId");
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");
CREATE INDEX "PurchaseOrder_preparedById_idx" ON "PurchaseOrder"("preparedById");
CREATE INDEX "PurchaseOrder_requestedById_idx" ON "PurchaseOrder"("requestedById");
CREATE INDEX "PurchaseOrder_reviewedById_idx" ON "PurchaseOrder"("reviewedById");
CREATE INDEX "PurchaseOrder_approvedById_idx" ON "PurchaseOrder"("approvedById");
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
