# NexusProcure: IOM API Endpoints

This document provides a detailed breakdown of all API endpoints related to Inter-Office Memos (IOMs).

## Business Logic File
The core business logic for these endpoints is located in `src/lib/iom.ts`.

## Schemas
The Zod schemas for validation are located in `src/lib/schemas.ts`.

---

## 1. `GET /api/iom`

Retrieves a paginated and filterable list of IOMs.

*   **Handler**: `src/app/api/iom/route.ts`
*   **Business Logic**: Calls `getIOMs(params)` from `src/lib/iom.ts`.
*   **Authorization**:
    *   Requires an authenticated session.
    *   Data visibility is filtered based on user role within the `getIOMs` function:
        *   **Administrator**: Sees all IOMs.
        *   **Manager / Approver**: Sees IOMs they prepared OR are assigned to review/approve.
        *   **Other roles**: See only the IOMs they prepared.
*   **Query Parameters Schema** (`getIOMsSchema`):
    *   `page`: `number` (default: 1)
    *   `pageSize`: `number` (default: 10)
    *   `search`: `string` (optional)
    *   `status`: `string[]` (optional)
*   **Success Response** (`200 OK`):
    ```json
    {
      "ioms": [
        {
          "id": "clx...",
          "iomNumber": "IOM-2023-0001",
          "title": "Request for new laptops",
          "status": "APPROVED",
          "items": [...],
          "preparedBy": { "name": "John Doe", "email": "john@example.com" }
        }
      ],
      "total": 1
    }
    ```

---

## 2. `POST /api/iom`

Creates a new Inter-Office Memo.

*   **Handler**: `src/app/api/iom/route.ts`
*   **Business Logic**: Calls `createIOM(data, session)` from `src/lib/iom.ts`.
*   **Authorization**: Requires the `CREATE_IOM` permission (checked via `authorize()` in `createIOM`).
*   **Request Body Schema** (`createIomSchema`):
    ```typescript
    z.object({
      title: z.string(),
      from: z.string(),
      to: z.string(),
      subject: z.string(),
      content: z.string().optional(),
      items: z.array(z.object({
        itemName: z.string(),
        description: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      })).min(1),
      requestedById: z.string().cuid(),
      reviewedById: z.string().cuid().optional(),
    });
    ```
*   **Success Response** (`201 Created`): Returns the full, newly created IOM object.
*   **Side Effects**:
    *   Generates a unique `iomNumber`.
    *   Sets initial status to `DRAFT`.
    *   Creates an `AuditLog` entry for the action.

---

## 3. `GET /api/iom/:id`

Retrieves a single IOM by its unique ID.

*   **Handler**: `src/app/api/iom/[id]/route.ts`
*   **Business Logic**: Calls `getIOMById(id)` from `src/lib/iom.ts`.
*   **Authorization**: Requires the `READ_IOM` permission.
*   **Success Response** (`200 OK`): Returns the full IOM object, including relations like `items`, `preparedBy`, etc.

---

## 4. `PATCH /api/iom/:id`

Updates the status of an existing IOM, moving it through the workflow.

*   **Handler**: `src/app/api/iom/[id]/route.ts`
*   **Business Logic**: Calls `updateIOMStatus(id, status, session, approverId)` from `src/lib/iom.ts`.
*   **Authorization**: Permissions are checked dynamically within `updateIOMStatus`:
    *   `APPROVE_IOM` for setting status to `APPROVED`.
    *   `REJECT_IOM` for setting status to `REJECTED`.
    *   `REVIEW_IOM` for `UNDER_REVIEW` or `PENDING_APPROVAL`.
    *   `UPDATE_IOM` for other changes (e.g., withdrawing to `DRAFT`).
*   **Request Body**:
    ```json
    {
      "status": "PENDING_APPROVAL", // IOMStatus enum value
      "approverId": "clx..." // Required when moving to PENDING_APPROVAL
    }
    ```
*   **Success Response** (`200 OK`): Returns the updated IOM object.
*   **Side Effects**:
    *   Creates an `AuditLog` entry.
    *   Creates `Notification` records for relevant users.
    *   Sends an email notification to the IOM creator.
    *   Triggers a `dashboard-update` event via Pusher.

---

## 5. `POST /api/iom/:id/convert`

Converts an approved IOM into a new Purchase Order.

*   **Handler**: `src/app/api/iom/[id]/convert/route.ts`
*   **Business Logic**:
    1.  Calls `getIOMById(id)` from `src/lib/iom.ts`.
    2.  Validates that the IOM status is `APPROVED`.
    3.  Calls `createPurchaseOrder(data, session)` from `src/lib/po.ts`.
*   **Authorization**: Requires the `CREATE_PO` permission (checked within `createPurchaseOrder`).
*   **Request Body**:
    ```json
    {
      "vendorId": "clx...",
      "vendorName": "...",
      "vendorAddress": "...",
      "vendorContact": "...",
      "companyName": "...",
      "companyAddress": "...",
      "companyContact": "...",
      "taxRate": 18
    }
    ```
*   **Success Response** (`201 Created`): Returns the newly created Purchase Order object.
*   **Side Effects**: Triggers all side effects associated with `createPurchaseOrder` (audit log, etc.).

---

## 6. `GET /api/iom/export`

Exports all IOMs as a CSV file.

*   **Handler**: `src/app/api/iom/export/route.ts`
*   **Business Logic**: Calls `getAllIOMsForExport(session)` from `src/lib/iom.ts`.
*   **Authorization**: Requires the `READ_ALL_IOMS` permission.
*   **Success Response** (`200 OK`): Returns a CSV file with all IOM data.
*   **Headers**:
    *   `Content-Type`: `text/csv`
    *   `Content-Disposition`: `attachment; filename="ioms-export-YYYY-MM-DDTHH-mm-ss.sssZ.csv"`

---

## 7. Workflow Diagram: IOM Status Update

This diagram illustrates the sequence of events when a user updates the status of an IOM (e.g., a reviewer submitting for approval).

```mermaid
sequenceDiagram
    participant User
    participant Frontend (React Component)
    participant API (`/api/iom/:id`)
    participant Lib (`src/lib/iom.ts`)
    participant AuthUtil (`src/lib/auth-utils.ts`)
    participant DB (Prisma)
    participant Services (Email, Notif, Audit, Pusher)

    User->>Frontend (React Component): Clicks "Submit for Approval"
    Frontend (React Component)->>API (`/api/iom/:id`): PATCH request with { status: 'PENDING_APPROVAL', approverId: '...' }
    API (`/api/iom/:id`)-)Lib (`src/lib/iom.ts`): Calls updateIOMStatus(id, status, session, approverId)

    Lib (`src/lib/iom.ts`)-)AuthUtil (`src/lib/auth-utils.ts`): Calls authorize(session, 'REVIEW_IOM')
    AuthUtil (`src/lib/auth-utils.ts`)-->>Lib (`src/lib/iom.ts`): Returns true

    Lib (`src/lib/iom.ts`)-)DB (Prisma): findUnique({ where: { id } })
    DB (Prisma)-->>Lib (`src/lib/iom.ts`): Returns IOM data

    Lib (`src/lib/iom.ts`)-)DB (Prisma): update({ where: { id }, data: { status, approvedById } })
    DB (Prisma)-->>Lib (`src/lib/iom.ts`): Returns updated IOM

    Lib (`src/lib/iom.ts`)-)Services (Email, Notif, Audit, Pusher): Calls createNotification, sendEmail, logAudit, triggerPusherEvent
    Services (Email, Notif, Audit, Pusher)-->>Lib (`src/lib/iom.ts`): Acknowledges

    Lib (`src/lib/iom.ts`)-->>API (`/api/iom/:id`): Returns updated IOM
    API (`/api/iom/:id`)-->>Frontend (React Component): Returns 200 OK with updated IOM
    Frontend (React Component)->>User: Displays success message
```
