# NexusProcure: Vendor Management API Endpoints

This document provides a detailed breakdown of all API endpoints related to Vendor Management.

## Business Logic File
The core business logic for these endpoints has been consolidated into `src/lib/vendor.ts`.

---

## 1. `GET /api/vendors`

Retrieves a paginated list of vendors.

*   **Handler**: `src/app/api/vendors/route.ts`
*   **Business Logic**: Calls `getVendors(params)` from `src/lib/vendor.ts`.
*   **Authorization**: Requires an authenticated session. Any logged-in user can view the list of vendors.
*   **Query Parameters**: `page`, `pageSize`.
*   **Success Response** (`200 OK`): Returns a detailed pagination object.
    ```json
    {
      "data": [ { ...vendorObject... } ], // Includes performance metrics
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
*   **Business Logic**: Calls `createVendor(data, session)` from `src/lib/vendor.ts`.
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

Retrieves a single vendor by their unique ID, including their purchase history and calculated performance metrics.

*   **Handler**: `src/app/api/vendors/[id]/route.ts`
*   **Business Logic**: Calls `getVendorById(id)` from `src/lib/vendor.ts`.
*   **Authorization**: Requires an authenticated session.
*   **Success Response** (`200 OK`): Returns the full vendor object with the following structure:
    ```json
    {
      "id": "...",
      "name": "...",
      "onTimeDeliveryRate": 88.5,
      "averageQualityScore": 4.5,
      "purchaseOrders": [ { ...poObject... } ]
    }
    ```

---

## 4. `PUT /api/vendors/:id`

Updates an existing vendor's details.

*   **Handler**: `src/app/api/vendors/[id]/route.ts`
*   **Business Logic**: Calls `updateVendor(id, data, session)` from `src/lib/vendor.ts`.
*   **Authorization**: Requires the `MANAGE_VENDORS` permission.
*   **Request Body Schema** (`updateVendorSchema`): A partial version of the `createVendorSchema`.
*   **Success Response** (`200 OK`): Returns the updated vendor object.

---

## 5. `DELETE /api/vendors/:id`

Deletes a vendor.

*   **Handler**: `src/app/api/vendors/[id]/route.ts`
*   **Business Logic**: Calls `deleteVendor(id, session)` from `src/lib/vendor.ts`.
*   **Authorization**: Requires the `MANAGE_VENDORS` permission.
*   **Success Response** (`200 OK`): Returns `{ "success": true }`.

---

## 6. `GET /api/vendors/export`

Exports all vendors as a CSV file.

*   **Handler**: `src/app/api/vendors/export/route.ts`
*   **Business Logic**: Calls `getAllVendorsForExport(session)` from `src/lib/vendor.ts`.
*   **Authorization**: Requires the `MANAGE_VENDORS` permission.
*   **Success Response** (`200 OK`): Returns a CSV file with all vendor data.
*   **Headers**:
    *   `Content-Type`: `text/csv`
    *   `Content-Disposition`: `attachment; filename="vendors-export-YYYY-MM-DDTHH-mm-ss.sssZ.csv"`

---

## 7. Vendor Performance Metrics

Vendor performance metrics are calculated automatically to provide insights into reliability and quality.

*   **Trigger**: The `updateVendorPerformanceMetrics` function is called automatically whenever a `PurchaseOrder` associated with the vendor is updated to the `DELIVERED` status. This logic resides in `src/lib/po.ts`.
*   **Metrics**:
    *   **`onTimeDeliveryRate`**: The percentage of delivered purchase orders that were fulfilled on or before their `expectedDeliveryDate`.
    *   **`averageQualityScore`**: The average of all `qualityScore` (1-5) ratings submitted for a vendor's purchase orders.
*   **Note**: The `qualityScore` for a Purchase Order can be updated via a `PATCH` request to `/api/po/:id`.