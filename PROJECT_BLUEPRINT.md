# NexusProcure: Project Blueprint

## 1. Introduction & Technology Stack

NexusProcure is a modern, full-stack web application designed for managing internal procurement processes. It allows users to create Inter-Office Memos (IOMs), convert them into Purchase Orders (POs), and finally process payments via Payment Requests (PRs). The system is built around a robust role-based access control (RBAC) system to ensure users only have access to the information and actions relevant to their position.

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
│   │   ├── dashboard/    # Frontend pages for the dashboard section
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
│   └── types/            # TypeScript type definitions
├── ...                   # Configuration files (next.config.js, package.json, etc.)
```

## 3. Database Schema & Data Models

The data model is defined in `prisma/schema.prisma`.

*   **Core Entities**: `IOM`, `PurchaseOrder`, `PaymentRequest`. Each has a corresponding `...Item` model for line items and a status enum (`IOMStatus`, `POStatus`, `PRStatus`) to track its lifecycle.
*   **User & Auth Models**: `User`, `Role`, `Permission`, and `PermissionsOnRoles` form the RBAC system. `Account`, `Session`, and `VerificationToken` are standard NextAuth.js models.
*   **Supporting Models**:
    *   `Vendor`: Stores supplier information.
    *   `Attachment`: A generic model for file uploads, linked to IOMs, POs, or PRs.
    *   `Notification`: For user-specific notifications.
    *   `AuditLog`: A critical model that logs all significant create, update, and delete actions for accountability.

## 4. Authentication & Authorization

*   **Authentication**: Uses JWTs. A user logs in via `/api/auth/signin` with an email and password. Upon successful authentication, a JWT is created containing their ID, role, and a flattened list of their permissions.
*   **Authorization**:
    *   **Backend**: A central `authorize(session, 'PERMISSION_NAME')` function in `src/lib/auth-utils.ts` is used in API routes and business logic to protect actions. It checks the permissions list in the user's JWT. The `ADMIN` role has a hardcoded bypass for all checks.
    *   **Frontend**: A custom `useHasPermission('PERMISSION_NAME')` hook checks the same permissions list on the client side. This allows the UI to be dynamically rendered (e.g., hiding buttons or navigation links) based on the user's capabilities.

## 5. Core Workflows & Business Logic

The application implements a standard three-stage procurement workflow, with all core logic neatly organized in the `src/lib` directory.

1.  **Inter-Office Memo (IOM)**: An internal user creates an IOM to request goods or services. It goes through a review and approval process (`DRAFT` -> `SUBMITTED` -> `UNDER_REVIEW` -> `PENDING_APPROVAL` -> `APPROVED` / `REJECTED`).
2.  **Purchase Order (PO)**: Once an IOM is approved, it can be converted into a PO. The PO is the formal order sent to an external `Vendor`. It follows a similar internal review and approval process, and has additional statuses for tracking the order's fulfillment (`ORDERED`, `DELIVERED`).
3.  **Payment Request (PR)**: Once a PO has been fulfilled (or is approved), a PR can be created to request payment. It also has its own approval workflow, ending in a `PROCESSED` status.

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

| Role          | Key Responsibilities & Capabilities                                                                    | Visibility                                                                |
|---------------|--------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| **ADMIN**     | Superuser. Has all permissions implicitly. Can manage users, roles, and vendors.                       | Sees all documents and data in the system.                                |
| **MANAGER**   | Approves/rejects documents.                                                                            | Sees their own documents and any documents assigned to them for approval. |
| **REVIEWER**  | Reviews documents before they are sent for final approval.                                               | Sees their own documents and any documents assigned to them for review.   |
| **User**      | A baseline user who can create and manage their own procurement requests.                                | Sees only the documents they have personally created.                     |

**Key Permissions:** `MANAGE_USERS`, `MANAGE_ROLES`, `MANAGE_VENDORS`, `VIEW_ANALYTICS`, `CREATE_IOM`, `APPROVE_IOM`, `REVIEW_IOM`, etc.
