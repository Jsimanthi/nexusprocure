# NexusProcure Improvement Roadmap

This document outlines the current status and future roadmap for enhancing the NexusProcure application.

---
## In Progress / Partially Completed
---

### 1. Granular Role-Based Access Control (RBAC)
The initial implementation of a permission-based RBAC system is underway.

-   **[Completed]** Backend Implementation:
    -   The database schema has been updated with `Role` and `Permission` models.
    -   A database seed script populates default roles and permissions.
    -   The authentication system now embeds permissions into the user session.
    -   Backend business logic has been refactored to check for specific permissions.
-   **[Not Yet Started]** Frontend Integration:
    -   The UI does not yet use the new permission system to conditionally show/hide controls (e.g., "Approve" or "Delete" buttons). This is the next critical step.
    -   A `useHasPermission` hook has been created to facilitate this work.

---
## Not Yet Started
---

### 2. User & Role Management UI
- **Description:** Create a new section in the dashboard for `ADMIN` users to manage users and roles.
- **Features:**
    -   Invite new users.
    -   Assign users to roles.
    -   Create, edit, and delete roles.
    -   Assign permissions to roles.

### 3. Enhanced Testing Strategy
- **Unit Test Depth:** While test files exist, their depth and coverage should be systematically reviewed to cover more edge cases and error conditions.
- **End-to-End (E2E) Testing:** Introduce a framework like **Playwright** to automate tests for critical user workflows (e.g., the full IOM -> PO -> CR lifecycle).

### 4. Advanced Dashboard Features
- **Description:** Expand the dashboard to provide more at-a-glance insights and analytics.
- **Features:**
    -   Summary cards ("Total Pending Approvals," "My Open Requests").
    -   Charts visualizing spending by category or vendor over time.
    -   A list of recent activities.
