-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowDefId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stepData" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowInstance_workflowDefId_fkey" FOREIGN KEY ("workflowDefId") REFERENCES "WorkflowDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkflowInstance_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_name_key" ON "WorkflowDefinition"("name");

-- CreateIndex
CREATE INDEX "WorkflowInstance_workflowDefId_idx" ON "WorkflowInstance"("workflowDefId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_entityType_entityId_idx" ON "WorkflowInstance"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_assignedTo_idx" ON "WorkflowInstance"("assignedTo");
