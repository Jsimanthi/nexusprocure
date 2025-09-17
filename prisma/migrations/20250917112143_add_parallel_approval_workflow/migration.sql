-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IOM" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iomNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "reviewerStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approverStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "preparedById" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IOM_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IOM_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IOM_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IOM_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IOM" ("approvedById", "content", "createdAt", "from", "id", "iomNumber", "preparedById", "requestedById", "reviewedById", "status", "subject", "title", "to", "totalAmount", "updatedAt") SELECT "approvedById", "content", "createdAt", "from", "id", "iomNumber", "preparedById", "requestedById", "reviewedById", "status", "subject", "title", "to", "totalAmount", "updatedAt" FROM "IOM";
DROP TABLE "IOM";
ALTER TABLE "new_IOM" RENAME TO "IOM";
CREATE UNIQUE INDEX "IOM_iomNumber_key" ON "IOM"("iomNumber");
CREATE TABLE "new_PaymentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prNumber" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRequest_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentRequest" ("approvedById", "bankAccount", "createdAt", "currency", "exchangeRate", "grandTotal", "id", "paymentDate", "paymentMethod", "paymentTo", "poId", "prNumber", "preparedById", "purpose", "referenceNumber", "requestedById", "reviewedById", "status", "taxAmount", "title", "totalAmount", "updatedAt") SELECT "approvedById", "bankAccount", "createdAt", "currency", "exchangeRate", "grandTotal", "id", "paymentDate", "paymentMethod", "paymentTo", "poId", "prNumber", "preparedById", "purpose", "referenceNumber", "requestedById", "reviewedById", "status", "taxAmount", "title", "totalAmount", "updatedAt" FROM "PaymentRequest";
DROP TABLE "PaymentRequest";
ALTER TABLE "new_PaymentRequest" RENAME TO "PaymentRequest";
CREATE UNIQUE INDEX "PaymentRequest_prNumber_key" ON "PaymentRequest"("prNumber");
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poNumber" TEXT NOT NULL,
    "iomId" TEXT,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_iomId_fkey" FOREIGN KEY ("iomId") REFERENCES "IOM" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("approvedById", "companyAddress", "companyContact", "companyName", "createdAt", "currency", "exchangeRate", "grandTotal", "id", "iomId", "poNumber", "preparedById", "requestedById", "reviewedById", "status", "taxAmount", "taxRate", "title", "totalAmount", "updatedAt", "vendorAddress", "vendorContact", "vendorId", "vendorName") SELECT "approvedById", "companyAddress", "companyContact", "companyName", "createdAt", "currency", "exchangeRate", "grandTotal", "id", "iomId", "poNumber", "preparedById", "requestedById", "reviewedById", "status", "taxAmount", "taxRate", "title", "totalAmount", "updatedAt", "vendorAddress", "vendorContact", "vendorId", "vendorName" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
