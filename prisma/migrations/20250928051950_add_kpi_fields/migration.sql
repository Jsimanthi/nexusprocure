-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "fulfilledAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IOM" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iomNumber" TEXT NOT NULL,
    "pdfToken" TEXT,
    "title" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_IOM" ("approvedById", "approverStatus", "content", "createdAt", "from", "id", "iomNumber", "pdfToken", "preparedById", "requestedById", "reviewedById", "reviewerStatus", "status", "subject", "title", "to", "totalAmount", "updatedAt") SELECT "approvedById", "approverStatus", "content", "createdAt", "from", "id", "iomNumber", "pdfToken", "preparedById", "requestedById", "reviewedById", "reviewerStatus", "status", "subject", "title", "to", "totalAmount", "updatedAt" FROM "IOM";
DROP TABLE "IOM";
ALTER TABLE "new_IOM" RENAME TO "IOM";
CREATE UNIQUE INDEX "IOM_iomNumber_key" ON "IOM"("iomNumber");
CREATE UNIQUE INDEX "IOM_pdfToken_key" ON "IOM"("pdfToken");
CREATE INDEX "IOM_preparedById_idx" ON "IOM"("preparedById");
CREATE INDEX "IOM_requestedById_idx" ON "IOM"("requestedById");
CREATE INDEX "IOM_reviewedById_idx" ON "IOM"("reviewedById");
CREATE INDEX "IOM_approvedById_idx" ON "IOM"("approvedById");
CREATE INDEX "IOM_status_idx" ON "IOM"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
