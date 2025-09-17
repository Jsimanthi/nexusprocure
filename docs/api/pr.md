# NexusProcure: Payment Request (PR) API Endpoints

This document provides a detailed breakdown of all API endpoints related to Payment Requests (PRs).

## Business Logic File
The core business logic for these endpoints is located in `src/lib/pr.ts`.

## Schemas
The Zod schemas for validation are located in `src/lib/schemas.ts`.

---

## 1. `GET /api/pr`

Retrieves a paginated and filterable list of PRs.

*   **Handler**: `src/app/api/pr/route.ts`
*   **Business Logic**: Calls `getPRs(session, params)` from `src/lib/pr.ts`.
*   **Authorization**: Role-based visibility is enforced in `getPRs` (Admin sees all, Manager sees own/assigned, etc.).
*   **Query Parameters**: `page`, `pageSize`, `search`, `status`.
*   **Success Response** (`200 OK`): Returns `{ prs: [...], total: ... }`.

---

## 2. `POST /api/pr`

Creates a new Payment Request.

*   **Handler**: `src/app/api/pr/route.ts`
*   **Business Logic**: Calls `createPaymentRequest(data, session)` from `src/lib/pr.ts`.
*   **Authorization**: Requires the `CREATE_PR` permission.
*   **Business Logic Note**: `createPaymentRequest` includes a check to ensure the PR's `grandTotal` does not exceed the `grandTotal` of its associated PO.
*   **Request Body Schema** (`createPrSchema`):
    ```typescript
    z.object({
      title: z.string(),
      poId: z.string().cuid().optional(),
      paymentTo: z.string(),
      paymentDate: z.coerce.date(),
      purpose: z.string(),
      paymentMethod: z.nativeEnum(PaymentMethod),
      bankAccount: z.string().optional(),
      referenceNumber: z.string().optional(),
      totalAmount: z.number(),
      taxAmount: z.number(),
      grandTotal: z.number(),
      requestedById: z.string().cuid(),
    });
    ```
*   **Success Response** (`201 Created`): Returns the newly created PR object.
*   **Side Effects**: Generates a `prNumber` and creates an `AuditLog`.

---

## 3. `GET /api/pr/:id`

Retrieves a single PR by its unique ID.

*   **Handler**: `src/app/api/pr/[id]/route.ts`
*   **Business Logic**: Calls `getPRById(id)` from `src/lib/pr.ts`.
*   **Authorization**: Requires the `READ_PR` permission.
*   **Success Response** (`200 OK`): Returns the full PR object.

---

## 4. `PATCH /api/pr/:id`

Updates the status of an existing Payment Request.

*   **Handler**: `src/app/api/pr/[id]/route.ts`
*   **Business Logic**: Calls `updatePRStatus(id, status, session, approverId)` from `src/lib/pr.ts`.
*   **Authorization**: Permissions are checked dynamically within `updatePRStatus`:
    *   `APPROVE_PR` for setting status to `APPROVED`.
    *   `REJECT_PR` for setting status to `REJECTED`.
    *   `UPDATE_PR` for other changes.
*   **Request Body**:
    ```json
    {
      "status": "APPROVED"
    }
    ```
*   **Success Response** (`200 OK`): Returns the updated PR object.
*   **Side Effects**: Creates an `AuditLog` entry, sends notifications, and triggers a Pusher event.
