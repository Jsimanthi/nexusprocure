# NexusProcure: User Management API Endpoints

This document provides a detailed breakdown of all API endpoints related to User Management.

---

## 1. `GET /api/users`

Fetches a list of users, with special filtering capabilities.

*   **Handler**: `src/app/api/users/route.ts`
*   **Business Logic**: Direct Prisma query within the handler.
*   **Authorization**: Complex, dual-purpose authorization:
    *   **Scenario A (General User Management)**: If no query parameters are passed, or if `?role=` is anything other than "Manager", it requires the `MANAGE_USERS` permission.
    *   **Scenario B (Fetching Managers for approvals)**: If `?role=Manager` is passed, it allows access to any authenticated user who has `REVIEW_IOM`, `REVIEW_PO`, or `CREATE_PR` permissions. This is a specific carve-out to allow users to select their manager from a list when submitting documents.
*   **Query Parameters**:
    *   `role` (string, optional): Filters the user list by the role's name.
*   **Success Response** (`200 OK`): Returns an array of sanitized user objects, including `id`, `name`, `email`, and `role` info.

---

## 2. `POST /api/users`

Creates a new user.

*   **Handler**: `src/app/api/users/route.ts`
*   **Business Logic**: Direct Prisma query within the handler.
*   **Authorization**: Requires the `MANAGE_USERS` permission.
*   **Request Body Schema** (`createUserSchema`):
    ```typescript
    z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(8),
      roleId: z.string().cuid(),
    });
    ```
*   **Business Logic Notes**:
    *   Checks if a user with the given email already exists (`409 Conflict`).
    *   Hashes the password with `bcrypt` before saving.
*   **Success Response** (`201 Created`): Returns the newly created user object (with password omitted).

---

## 3. `GET /api/users/:id`

Retrieves a single user by their unique ID.

*   **Handler**: `src/app/api/users/[id]/route.ts`
*   **Authorization**: Requires the `MANAGE_USERS` permission.
*   **Success Response** (`200 OK`): Returns a sanitized user object.

---

## 4. `PUT /api/users/:id`

Updates a user's role.

*   **Handler**: `src/app/api/users/[id]/route.ts`
*   **Authorization**: Requires the `MANAGE_USERS` permission.
*   **Request Body Schema**:
    ```typescript
    z.object({
      roleId: z.string().cuid(),
    });
    ```
*   **Success Response** (`200 OK`): Returns the updated, sanitized user object.

---

## 5. `GET /api/users/role/:roleName`

Fetches a minimal list of users belonging to a specific role. This is a more lightweight alternative to `GET /api/users?role=...`.

*   **Handler**: `src/app/api/users/role/[roleName]/route.ts`
*   **Authorization**: Requires an authenticated session. No specific permission is checked, making it suitable for populating dropdowns for all users (e.g., "Select a reviewer").
*   **Success Response** (`200 OK`): Returns an array of minimal user objects: `{ id, name }`.
