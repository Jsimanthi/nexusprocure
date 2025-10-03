-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
    "departmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IOM_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IOM_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IOM_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IOM_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IOM_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IOM" ("approvedById", "approverStatus", "content", "createdAt", "from", "id", "iomNumber", "isUrgent", "pdfToken", "preparedById", "requestedById", "reviewedById", "reviewerStatus", "status", "subject", "title", "to", "totalAmount", "updatedAt") SELECT "approvedById", "approverStatus", "content", "createdAt", "from", "id", "iomNumber", "isUrgent", "pdfToken", "preparedById", "requestedById", "reviewedById", "reviewerStatus", "status", "subject", "title", "to", "totalAmount", "updatedAt" FROM "IOM";
DROP TABLE "IOM";
ALTER TABLE "new_IOM" RENAME TO "IOM";
CREATE UNIQUE INDEX "IOM_iomNumber_key" ON "IOM"("iomNumber");
CREATE UNIQUE INDEX "IOM_pdfToken_key" ON "IOM"("pdfToken");
CREATE INDEX "IOM_preparedById_idx" ON "IOM"("preparedById");
CREATE INDEX "IOM_requestedById_idx" ON "IOM"("requestedById");
CREATE INDEX "IOM_reviewedById_idx" ON "IOM"("reviewedById");
CREATE INDEX "IOM_approvedById_idx" ON "IOM"("approvedById");
CREATE INDEX "IOM_status_idx" ON "IOM"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "roleId" TEXT,
    "password" TEXT,
    "departmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "password", "roleId", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "password", "roleId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
