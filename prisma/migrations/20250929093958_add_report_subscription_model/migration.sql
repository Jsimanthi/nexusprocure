-- CreateTable
CREATE TABLE "ReportSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReportSubscription_userId_idx" ON "ReportSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSubscription_userId_reportType_key" ON "ReportSubscription"("userId", "reportType");
