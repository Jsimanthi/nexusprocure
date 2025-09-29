-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_POItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "poId" TEXT NOT NULL,
    "iomItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "POItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "POItem_iomItemId_fkey" FOREIGN KEY ("iomItemId") REFERENCES "IOMItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_POItem" ("category", "createdAt", "description", "id", "itemName", "poId", "quantity", "taxAmount", "taxRate", "totalPrice", "unitPrice", "updatedAt") SELECT "category", "createdAt", "description", "id", "itemName", "poId", "quantity", "taxAmount", "taxRate", "totalPrice", "unitPrice", "updatedAt" FROM "POItem";
DROP TABLE "POItem";
ALTER TABLE "new_POItem" RENAME TO "POItem";
CREATE INDEX "POItem_poId_idx" ON "POItem"("poId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
