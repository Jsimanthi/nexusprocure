# NexusProcure: Role Management API Endpoints

This document provides a detailed breakdown of all API endpoints related to Role Management. All endpoints in this section require the `MANAGE_ROLES` permission.

---

## 1. `GET /api/roles`

Fetches a list of all roles in the system.

*   **Handler**: `src/app/api/roles/route.ts`
*   **Authorization**: Requires the `MANAGE_ROLES` permission.
*   **Success Response** (`200 OK`): Returns an array of all role objects.
    ```json
    [
      { "id": "clx...", "name": "Administrator" },
      { "id": "clx...", "name": "Manager" }
    ]
    ```

---

## 2. `GET /api/roles/:id`

Fetches a single role by its ID, including all permissions assigned to it.

*   **Handler**: `src/app/api/roles/[id]/route.ts`
*   **Authorization**: Requires the `MANAGE_ROLES` permission.
*   **Success Response** (`200 OK`): Returns a single role object with a nested `permissions` array.
    ```json
    {
      "id": "clx...",
      "name": "Approver",
      "permissions": [
        {
          "roleId": "clx...",
          "permissionId": "clx...",
          "assignedAt": "...",
          "assignedBy": "...",
          "permission": {
            "id": "clx...",
            "name": "REVIEW_PO"
          }
        }
      ]
    }
    ```

---

## 3. `PUT /api/roles/:id`

Updates a role's name and overwrites its entire set of permissions.

*   **Handler**: `src/app/api/roles/[id]/route.ts`
*   **Authorization**: Requires the `MANAGE_ROLES` permission.
*   **Business Logic**: This operation is wrapped in a `prisma.$transaction` to ensure atomicity. It first updates the role's name, then deletes all existing entries for that role from the `PermissionsOnRoles` join table, and finally creates new entries based on the `permissionIds` array provided in the request.
*   **Request Body**:
    ```json
    {
      "name": "Senior Approver",
      "permissionIds": ["clx...", "clx..."]
    }
    ```
*   **Success Response** (`200 OK`): Returns the updated role object (note: it does not include the newly set permissions in the response).
