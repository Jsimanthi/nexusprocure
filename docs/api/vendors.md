# NexusProcure: Vendor Management API Endpoints

This document provides a detailed breakdown of all API endpoints related to Vendor Management.

## Business Logic File
The core business logic for these endpoints is located in `src/lib/po.ts`, as Vendors are closely tied to Purchase Orders.

---

## 1. `GET /api/vendors`

Retrieves a paginated list of vendors.

*   **Handler**: `src/app/api/vendors/route.ts`
*   **Business Logic**: Calls `getVendors(params)` from `src/lib/po.ts`.
*   **Authorization**: Requires an authenticated session. Any logged-in user can view the list of vendors.
*   **Query Parameters**: `page`, `pageSize`.
*   **Success Response** (`200 OK`): Returns a detailed pagination object.
    ```json
    {
      "data": [ { ...vendorObject... } ],
      "total": 25,
      "page": 1,
      "pageSize": 10,
      "pageCount": 3
    }
    ```

---

## 2. `POST /api/vendors`

Creates a new vendor.

*   **Handler**: `src/app/api/vendors/route.ts`
*   **Business Logic**: Calls `createVendor(data, session)` from `src/lib/po.ts`.
*   **Authorization**: Requires the `MANAGE_VENDORS` permission.
*   **Request Body Schema** (`createVendorSchema`):
    ```typescript
    z.object({
      name: z.string(),
      address: z.string(),
      contactInfo: z.string(),
      taxId: z.string().optional(),
      website: z.string().url().optional(),
      email: z.string().email(),
      phone: z.string(),
      currency: z.enum(['INR', 'USD', ...]).default('INR'),
    });
    ```
*   **Success Response** (`201 Created`): Returns the newly created vendor object.

---

## 3. `GET /api/vendors/:id`

Retrieves a single vendor by their unique ID.

*   **Handler**: `src/app/api/vendors/[id]/route.ts`
*   **Business Logic**: Calls `getVendorById(id)` from `src/lib/po.ts`.
*   **Authorization**: Requires an authenticated session.
*   **Success Response** (`200 OK`): Returns the full vendor object.

---

## 4. `PUT /api/vendors/:id`

Updates an existing vendor's details.

*   **Handler**: `src/app/api/vendors/[id]/route.ts`
*   **Business Logic**: Calls `updateVendor(id, data, session)` from `src/lib/po.ts`.
*   **Authorization**: Requires the `MANAGE_VENDORS` permission.
*   **Request Body Schema** (`updateVendorSchema`): A partial version of the `createVendorSchema`.
*   **Success Response** (`200 OK`): Returns the updated vendor object.

---

## 5. `DELETE /api/vendors/:id`

Deletes a vendor.

*   **Handler**: `src/app/api/vendors/[id]/route.ts`
*   **Business Logic**: Calls `deleteVendor(id, session)` from `src/lib/po.ts`.
*   **Authorization**: Requires the `MANAGE_VENDORS` permission.
*   **Success Response** (`200 OK`): Returns `{ "success": true }`.
