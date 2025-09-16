# NexusProcure: Purchase Order (PO) API Endpoints

This document provides a detailed breakdown of all API endpoints related to Purchase Orders (POs).

## Business Logic File
The core business logic for these endpoints is located in `src/lib/po.ts`.

## Schemas
The Zod schemas for validation are located in `src/lib/schemas.ts`.

---

## 1. `GET /api/po`

Retrieves a paginated and filterable list of POs.

*   **Handler**: `src/app/api/po/route.ts`
*   **Business Logic**: Calls `getPOs(session, params)` from `src/lib/po.ts`.
*   **Authorization**: Role-based visibility is enforced in `getPOs`, identical to the IOM flow (Admin sees all, Manager sees own/assigned, etc.).
*   **Query Parameters**: `page`, `pageSize`, `search`, `status`.
*   **Success Response** (`200 OK`): Returns `{ pos: [...], total: ... }`.

---

## 2. `POST /api/po`

Creates a new Purchase Order.

*   **Handler**: `src/app/api/po/route.ts`
*   **Business Logic**: Calls `createPurchaseOrder(data, session)` from `src/lib/po.ts`.
*   **Authorization**: Requires the `CREATE_PO` permission.
*   **Request Body Schema** (`createPoSchema`):
    ```typescript
    z.object({
      title: z.string(),
      iomId: z.string().cuid().optional(),
      vendorId: z.string().cuid().optional(),
      companyName: z.string(),
      // ... other company/vendor details
      taxRate: z.number(),
      items: z.array(createPoItemSchema),
      // ...
    });
    ```
*   **Success Response** (`201 Created`): Returns the newly created PO object.
*   **Side Effects**: Generates a `poNumber`, calculates taxes and totals, and creates an `AuditLog`.

---

## 3. `GET /api/po/:id`

Retrieves a single PO by its unique ID.

*   **Handler**: `src/app/api/po/[id]/route.ts`
*   **Business Logic**: Calls `getPOById(id)` from `src/lib/po.ts`.
*   **Authorization**: Requires the `READ_PO` permission.
*   **Success Response** (`200 OK`): Returns the full PO object.

---

## 4. `PATCH /api/po/:id`

Updates the status of an existing PO.

*   **Handler**: `src/app/api/po/[id]/route.ts`
*   **Business Logic**: Calls `updatePOStatus(id, status, session, approverId)` from `src/lib/po.ts`.
*   **Authorization**: Dynamic permission checks based on target status (`APPROVE_PO`, `REVIEW_PO`, etc.).
*   **Request Body**: `{ "status": "...", "approverId": "..." }`.
*   **Success Response** (`200 OK`): Returns the updated PO object.
*   **Side Effects**: Creates `AuditLog`, `Notification`, sends email, and triggers Pusher event.

---

## 5. `POST /api/po/:id/convert`

Converts an approved PO into a new Payment Request (PR).

*   **Handler**: `src/app/api/po/[id]/convert/route.ts`
*   **Business Logic**:
    1.  Calls `getPOById(id)`.
    2.  Validates that PO status is `APPROVED`, `ORDERED`, or `DELIVERED`.
    3.  Calls `createPaymentRequest(data, session)` from `src/lib/pr.ts`.
*   **Authorization**: Requires the `CREATE_PR` permission (checked in `createPaymentRequest`).
*   **Request Body**: `{ "paymentMethod": "..." }`.
*   **Success Response** (`201 Created`): Returns the newly created PR object.

---

## 6. `POST /api/po/bulk-status`

Updates the status for multiple POs at once.

*   **Handler**: `src/app/api/po/bulk-status/route.ts`
*   **Business Logic**: Iterates through a list of IDs and calls `updatePOStatus` for each.
*   **Authorization**: Relies on the permissions check within each `updatePOStatus` call.
*   **Request Body Schema**:
    ```typescript
    z.object({
      poIds: z.array(z.string().cuid()).min(1),
      status: z.nativeEnum(POStatus),
    });
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "results": [
        { "id": "...", "success": true, "data": { ... } },
        { "id": "...", "success": false, "error": "..." }
      ]
    }
    ```

---

## 7. `GET /api/po/iom`

Fetches approved IOMs that can be converted into a PO.

*   **Handler**: `src/app/api/po/iom/route.ts`
*   **Business Logic**: Performs a direct Prisma query to find IOMs where `status` is `APPROVED` and they have no existing linked POs.
*   **Authorization**: Requires an authenticated session.
*   **Success Response** (`200 OK`): Returns an array of eligible IOM objects.
