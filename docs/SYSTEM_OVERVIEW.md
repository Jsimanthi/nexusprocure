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
    - **`iom.ts`, `po.ts`, `pr.ts`**: Contain all backend functions for creating, reading, updating, and deleting records for each module.
    - **`auth-config.ts`, `auth-utils.ts`**: Define the NextAuth.js configuration and authorization helper functions.
    - **`schemas.ts`**: Central location for all Zod validation schemas.
- **`src/components/`**: Shared, reusable React components.
- **`prisma/`**: Contains the `schema.prisma` file, database migrations, and seed scripts.

## 4. Key Features

### 4.1. Procurement Workflow
The application manages a three-stage procurement process (IOM -> PO -> PR) with multi-level approval workflows.

### 4.2. Role-Based Access Control (RBAC)
A granular permissions system controls user access to features and data. Roles and permissions are managed in the `prisma/seed.ts` file.