# NexusProcure: Project Blueprint

## 1. Introduction & Technology Stack

NexusProcure is a modern, full-stack web application designed for managing internal procurement processes. It allows users to create Inter-Office Memos (IOMs), convert them into Purchase Orders (POs), and finally process payments via Payment Requests (PRs). The system is built around a robust role-based access control (RBAC) system and includes departmental tracking to ensure users only have access to relevant information and to provide insights into departmental spending.

**Core Technologies:**

*   **Framework**: Next.js 15 (with App Router & Turbopack)
*   **Language**: TypeScript
*   **Database & ORM**: SQLite (for development) with Prisma
*   **Authentication**: NextAuth.js (v5) with a Credentials (email/password) provider and JWT session strategy.
*   **Styling**: Tailwind CSS
*   **Frontend State Management**:
    *   Server State/Caching: TanStack React Query
    *   Client State: Zustand (though not heavily used in the files analyzed)
*   **Real-time**: Pusher for real-time notifications and dashboard updates.
*   **Forms**: React Hook Form with Zod for validation.
*   **File Uploads**: Vercel Blob
*   **Email**: Resend
*   **Testing**: Vitest with React Testing Library

## 2. Project Structure

The project follows a standard Next.js App Router structure.

```
/
├── prisma/               # Database schema, migrations, and seed scripts
├── public/               # Static assets
├── src/
│   ├── app/              # Application routes
│   │   ├── api/          # API endpoints, structured by feature
│   │   │   └── departments/ # API for managing departments
│   │   ├── dashboard/    # Frontend pages for the dashboard section
│   │   │   └── departments/ # UI for managing departments
│   │   ├── iom/          # Frontend pages for IOM management
│   │   ├── po/           # Frontend pages for PO management
│   │   ├── pr/           # Frontend pages for PR management
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main landing page
│   ├── components/       # Reusable React components
│   │   ├── emails/       # React components for email templates
│   │   └── ...
│   ├── hooks/            # Custom React hooks (e.g., useHasPermission)
│   ├── lib/              # Core business logic, helpers, and utilities
│   │   ├── auth-config.ts# NextAuth.js configuration
│   │   ├── iom.ts        # Business logic for IOMs
│   │   ├── po.ts         # Business logic for POs
│   │   ├── pr.ts         # Business logic for PRs
│   │   ├── prisma.ts     # Prisma client instance
│   │   └── schemas.ts    # Zod validation schemas
│   ├── providers/        # React Context providers (Session, React Query)
│   └── types/            # TypeScript type augmentation files (e.g., next-auth.d.ts)
├── ...                   # Configuration files (next.config.js, package.json, etc.)
```

## 3. Database Schema & Data Models

The data model is defined in `prisma/schema.prisma`.

*   **Core Entities**: `IOM`, `PurchaseOrder`, `PaymentRequest`. Each has a corresponding `...Item` model for line items and a status enum (`IOMStatus`, `POStatus`, `PRStatus`) to track its lifecycle. These core entities are linked to a `Department` to enable spend tracking.
*   **User & Auth Models**: `User`, `Role`, `Permission`, and `PermissionsOnRoles` form the RBAC system. A `User` is assigned to a single `Department`. `Account`, `Session`, and `VerificationToken` are standard NextAuth.js models.
*   **Supporting Models**:
    *   `Department`: A new model to represent organizational departments (e.g., IT, HR, Finance).
    *   `Vendor`: Stores supplier information.
    *   `Attachment`: A generic model for file uploads, linked to IOMs, POs, or PRs.
    *   `Notification`: For user-specific notifications.
    *   `AuditLog`: A critical model that logs all significant create, update, and delete actions for accountability.

## 4. Authentication & Authorization

*   **Authentication**: Uses JWTs. A user logs in via `/api/auth/signin` with an email and password. Upon successful authentication, a JWT is created containing their ID, role, department, and a flattened list of their permissions.
*   **Authorization**:
    *   **Backend**: A central `authorize(session, 'PERMISSION_NAME')` function in `src/lib/auth-utils.ts` is used in API routes and business logic to protect actions. It checks the permissions list in the user's JWT. The `Administrator` role has a hardcoded bypass for all checks.
    *   **Frontend**: A custom `useHasPermission('PERMISSION_NAME')` hook checks the same permissions list on the client side. This allows the UI to be dynamically rendered (e.g., hiding buttons or navigation links) based on the user's capabilities.

## 5. Core Workflows & Business Logic

The application implements a standard three-stage procurement workflow, with all core logic neatly organized in the `src/lib` directory. A key feature is the automatic inheritance of the `departmentId` throughout the workflow.

1.  **Inter-Office Memo (IOM)**: An internal user creates an IOM, which is automatically tagged with their department ID. It goes through a review and approval process (`DRAFT` -> `SUBMITTED` -> `UNDER_REVIEW` -> `PENDING_APPROVAL` -> `APPROVED` / `REJECTED`).
2.  **Purchase Order (PO)**: Once an IOM is approved, it can be converted into a PO. The PO inherits the `departmentId` from the parent IOM. If a PO is created as a standalone document, it inherits the department from the user who created it.
3.  **PaymentRequest (PR)**: Once a PO has been fulfilled or is approved, a PR can be created to request payment. The PR inherits the `departmentId` from its parent PO, ensuring a consistent departmental link from start to finish.

Each status change in these workflows triggers notifications (in-app and email) and is recorded in the `AuditLog`.

## 6. API Endpoint Documentation

The API is located in `src/app/api` and is structured by feature. A consistent pattern is used:

*   The API route file (`route.ts`) is responsible for handling the HTTP request, calling `auth()` to get the session, validating incoming data against a Zod schema, and then calling a function from a corresponding file in `src/lib` to execute the business logic.
*   Permissions are checked at the beginning of the business logic functions in the `src/lib` files.
*   This keeps the API routes clean and separates concerns effectively.

## 7. Frontend Architecture

The frontend is built with modern React practices.

*   **Component-Based**: The UI is composed of reusable components from `src/components`.
*   **Layout**: A `PageLayout` component provides a consistent structure and header for all pages.
*   **Data Fetching**: TanStack React Query is used universally for fetching data from the API, providing caching and consistent handling of loading and error states.
*   **Permission-Driven UI**: The UI dynamically adapts based on user permissions. The `DashboardHeader` hides inaccessible navigation links, and pages are expected to use the `useHasPermission` hook to conditionally render action buttons.
*   **Real-time**: Pusher is used to subscribe to channels (e.g., `dashboard-channel`) and automatically refetch data via React Query when an update event is received, keeping the UI fresh without page reloads.

## 8. Roles & Permissions Matrix

The system's security is based on the following roles and their associated permissions.

| Role                    | Key Responsibilities & Capabilities                                                                    | Visibility                                                                |
|-------------------------|--------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| **Administrator**       | Superuser. Has all permissions implicitly. Can manage users, roles, vendors, and departments.          | Sees all documents and data in the system.                                |
| **Manager** / **Approver** | Approves/rejects documents. Can also be assigned to review.                                            | Sees their own documents and any documents assigned to them for review/approval. |
| **Procurement Officer** | A baseline user who can create and manage their own procurement requests (IOMs, POs, PRs).               | Sees only the documents they have personally created.                     |
| **Finance Officer**     | A specialized user responsible for processing approved payment requests.                                 | Primarily sees approved PRs ready for payment.                            |

**Key Permissions:** `MANAGE_USERS`, `MANAGE_ROLES`, `MANAGE_VENDORS`, `MANAGE_DEPARTMENTS`, `VIEW_ANALYTICS`, `CREATE_IOM`, `APPROVE_IOM`, `REVIEW_IOM`, etc.