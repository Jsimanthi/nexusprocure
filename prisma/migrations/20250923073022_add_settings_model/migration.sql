-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Attachment_iomId_idx" ON "Attachment"("iomId");

-- CreateIndex
CREATE INDEX "Attachment_poId_idx" ON "Attachment"("poId");

-- CreateIndex
CREATE INDEX "Attachment_prId_idx" ON "Attachment"("prId");

-- CreateIndex
CREATE INDEX "IOM_preparedById_idx" ON "IOM"("preparedById");

-- CreateIndex
CREATE INDEX "IOM_requestedById_idx" ON "IOM"("requestedById");

-- CreateIndex
CREATE INDEX "IOM_reviewedById_idx" ON "IOM"("reviewedById");

-- CreateIndex
CREATE INDEX "IOM_approvedById_idx" ON "IOM"("approvedById");

-- CreateIndex
CREATE INDEX "IOM_status_idx" ON "IOM"("status");

-- CreateIndex
CREATE INDEX "IOMItem_iomId_idx" ON "IOMItem"("iomId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "POItem_poId_idx" ON "POItem"("poId");

-- CreateIndex
CREATE INDEX "PaymentRequest_poId_idx" ON "PaymentRequest"("poId");

-- CreateIndex
CREATE INDEX "PaymentRequest_preparedById_idx" ON "PaymentRequest"("preparedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_requestedById_idx" ON "PaymentRequest"("requestedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_reviewedById_idx" ON "PaymentRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_approvedById_idx" ON "PaymentRequest"("approvedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE INDEX "PermissionsOnRoles_roleId_idx" ON "PermissionsOnRoles"("roleId");

-- CreateIndex
CREATE INDEX "PermissionsOnRoles_permissionId_idx" ON "PermissionsOnRoles"("permissionId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_iomId_idx" ON "PurchaseOrder"("iomId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_preparedById_idx" ON "PurchaseOrder"("preparedById");

-- CreateIndex
CREATE INDEX "PurchaseOrder_requestedById_idx" ON "PurchaseOrder"("requestedById");

-- CreateIndex
CREATE INDEX "PurchaseOrder_reviewedById_idx" ON "PurchaseOrder"("reviewedById");

-- CreateIndex
CREATE INDEX "PurchaseOrder_approvedById_idx" ON "PurchaseOrder"("approvedById");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
