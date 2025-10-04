# System Overview: NexusProcure

## 1. Core Purpose

NexusProcure is a full-stack web application designed to streamline internal procurement workflows. It enables users to manage the entire lifecycle of a purchase, from an internal request to vendor payment, through a three-stage process:

1.  **Inter-Office Memo (IOM)**: An internal user drafts and submits a request for goods or services.
2.  **Purchase Order (PO)**: Upon IOM approval, a formal PO is generated and sent to an external vendor.
3.  **Payment Request (PR)**: After the PO is fulfilled, a PR is created to process the payment.

The system is built with a robust Role-Based Access Control (RBAC) system to ensure data security and process integrity.

## 2. Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Development) with Prisma ORM
- **Authentication**: NextAuth.js v5 (JWT Session Strategy)
- **Styling**: Tailwind CSS
- **State Management**: React Query (Server State), Zustand (Client State)
- **Forms**: React Hook Form with Zod for validation
- **Testing**: Vitest and React Testing Library

## 3. Architecture

The project follows a feature-centric structure within the Next.js App Router paradigm.

- **`src/app/`**: Contains all application routes.
    - **`api/`**: Houses all backend API endpoints, logically separated by feature (e.g., `api/iom`, `api/po`).
    - **`dashboard/`, `iom/`, `po/`, `pr/`**: Contain the frontend pages for each respective feature.
- **`src/lib/`**: The core of the application's business logic.
    - **`iom.ts`, `po.ts`, `pr.ts`**: Contain all backend functions for creating, reading, updating, and deleting records for each module. This includes logic for status transitions, notifications, and audit logging.
    - **`auth-config.ts`, `auth-utils.ts`**: Define the NextAuth.js configuration and authorization helper functions (e.g., `authorize`).
    - **`schemas.ts`**: Central location for all Zod validation schemas used in forms and API endpoints.
    - **`prisma.ts`**: Exports the singleton Prisma client instance.
- **`src/components/`**: Shared, reusable React components.
- **`prisma/`**: Contains the `schema.prisma` file, database migrations, and seed scripts.

## 4. Core Workflow & Business Logic

The application's primary workflow is linear and enforced by status changes in the database.

1.  **IOM Creation**: A user with `CREATE_IOM` permission initiates a request. The IOM moves through statuses like `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`. The logic in `src/lib/iom.ts` handles these transitions, including multi-level approvals (reviewer and approver).

2.  **PO Conversion**: An `APPROVED` IOM can be converted into a Purchase Order. The core logic resides in `src/lib/po.ts`. The PO has its own lifecycle (`PENDING_APPROVAL`, `APPROVED`, `ORDERED`, `DELIVERED`, `CANCELLED`). This module also includes logic for managing vendors (`createVendor`, `updateVendor`).

3.  **PR Generation**: A `DELIVERED` or `APPROVED` PO can be used to generate a Payment Request. `src/lib/pr.ts` governs this process. The PR follows a final approval workflow (`PENDING_APPROVAL`, `APPROVED`, `PROCESSED`, `REJECTED`).

**Key Supporting Logic:**

- **`src/lib/audit.ts`**: The `logAudit` function is called after every significant database mutation (create, update, delete) to record a history of changes for accountability.
- **`src/lib/notification.ts` & `src/lib/email.ts`**: Status changes and assignments trigger in-app and email notifications to relevant users.

## 5. Authentication and Authorization

- **Authentication**: Handled by NextAuth.js using an email/password credentials provider. Upon successful login, a JWT is created containing the user's ID, role, and a pre-fetched list of their permissions.
- **Authorization**:
    - **Backend**: The `authorize(session, 'PERMISSION_NAME')` function in `src/lib/auth-utils.ts` is the gatekeeper for all sensitive actions. It checks the permission list within the user's JWT.
    - **Frontend**: The `useHasPermission('PERMISSION_NAME')` hook provides a client-side mechanism to conditionally render UI elements (like buttons and links), preventing users from seeing actions they cannot perform.

This dual approach ensures that the API is secure while providing a clean user experience.