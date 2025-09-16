# NexusProcure: Miscellaneous API Endpoints

This document provides a detailed breakdown of the remaining API endpoints that do not belong to a larger resource category.

---

## 1. Analytics

### `GET /api/analytics`

Fetches aggregated data for the analytics dashboard.

*   **Handler**: `src/app/api/analytics/route.ts`
*   **Authorization**: Requires the `VIEW_ANALYTICS` permission.
*   **Business Logic**: Performs several Prisma `count` and `groupBy` queries to calculate:
    *   Total counts of IOMs, POs, and PRs.
    *   Counts of POs grouped by their status.
    *   Total spending on approved POs, grouped by month for the last 12 months.
*   **Success Response** (`200 OK`): Returns a JSON object with keys `documentCounts`, `poStatusCounts`, and `spendingByMonth`.

---

## 2. Dashboard

### `GET /api/dashboard`

Fetches summary data for the main dashboard view.

*   **Handler**: `src/app/api/dashboard/route.ts`
*   **Authorization**: Requires an authenticated session.
*   **Business Logic**: Fetches all IOMs, POs, and PRs to calculate:
    *   Total counts of each document type.
    *   A total count of documents pending approval.
    *   A list of the 10 most recent activities across all document types.
*   **Success Response** (`200 OK`): Returns a JSON object with keys `iomCount`, `poCount`, `prCount`, `pendingApprovals`, and `recentActivity`.

---

## 3. Notifications

*   **`GET /api/notifications`**: Fetches the 20 most recent notifications for the logged-in user.
*   **`POST /api/notifications/mark-all-read`**: Marks all of the user's notifications as read.
*   **`PATCH /api/notifications/:id`**: Marks a single notification as read. Ensures the notification belongs to the user making the request.

---

## 4. Permissions

### `GET /api/permissions`

Fetches a list of all available permissions in the system.

*   **Handler**: `src/app/api/permissions/route.ts`
*   **Authorization**: Requires the `MANAGE_ROLES` permission.
*   **Usage**: Used on the role management page to populate the list of available permissions that can be assigned to a role.
*   **Success Response** (`200 OK`): Returns an array of all permission objects.

---

## 5. Pusher

### `POST /api/pusher/auth`

Authenticates a user's subscription to a private Pusher channel.

*   **Handler**: `src/app/api/pusher/auth/route.ts`
*   **Authorization**: Requires an authenticated session. Critically, it validates that the user is only attempting to subscribe to their own personal channel (e.g., `private-user-USERID`).
*   **Usage**: This endpoint is called automatically by the Pusher client library when subscribing to a private channel.
*   **Success Response** (`200 OK`): Returns the authentication signature required by Pusher.

---

## 6. Upload

### `POST /api/upload`

Handles file uploads to Vercel Blob storage.

*   **Handler**: `src/app/api/upload/route.ts`
*   **Authorization**: Requires an authenticated session.
*   **Query Parameters**: `filename` (string, required).
*   **Request Body**: The raw file data stream.
*   **Success Response** (`200 OK`): Returns the Vercel Blob object, which includes the public `url` of the uploaded file.
