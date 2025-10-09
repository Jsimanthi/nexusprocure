# NexusProcure - Internal Procurement Management System

NexusProcure is a full-stack web application designed to streamline internal procurement workflows. It enables users to manage the entire lifecycle of a purchase, from an internal request to vendor payment, through a three-stage process: Inter-Office Memo (IOM), Purchase Order (PO), and PaymentRequest (PR).

## Features

- **End-to-End Procurement Workflow**: Manage the entire procurement lifecycle, from initial request (IOM) to purchase order (PO) and final payment (PR).
- **Role-Based Access Control (RBAC)**: A granular permissions system ensures that users can only access the features and data relevant to their roles.
- **Dashboard & Analytics**: An actionable, role-based dashboard provides key performance indicators (KPIs) and visualizations for spend analysis.
- **Multi-Level Approval Workflows**: Configure approval chains for IOMs, POs, and PRs to match your organization's policies.
- **Document Management**: Generate, view, and print PDFs for all procurement documents.
- **Vendor Management**: Maintain a central database of vendors and track their performance.
- **System & Application Settings**: Administrators can configure application-wide settings and monitor system health.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Development), PostgreSQL (Production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (JWT Session Strategy)
- **Styling**: Tailwind CSS
- **State Management**: React Query (Server State), Zustand (Client State)
- **Forms**: React Hook Form with Zod for validation
- **Testing**: Vitest and React Testing Library

## Getting Started

Follow these steps to get your local development environment set up and running.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nexusprocure
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file by copying the example file:

```bash
cp .env.example .env
```

Open the `.env` file and fill in the required values. For local development, the `DATABASE_URL` should be `file:./dev.db`.

### 4. Set Up and Seed the Database

Run the following command to apply database migrations and populate the database with initial seed data (users, roles, permissions, etc.):

```bash
npx prisma migrate dev
```

The seed data includes default user accounts with different roles. You can find the credentials in `prisma/seed.ts`.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Testing and Building

### Running Tests

To run the test suite, use the following command:

```bash
npm test
```

### Building for Production

To create a production-ready build of the application, run:

```bash
npm run build
```

This command prepares the application for deployment with a PostgreSQL database. For more details, refer to the `scripts/prepare-production.js` file.

## Project Structure

The project follows a feature-centric structure within the Next.js App Router paradigm.

- **`src/app/`**: Contains all application routes.
  - **`api/`**: Houses all backend API endpoints.
  - **`dashboard/`, `iom/`, `po/`, `pr/`**: Contain the frontend pages for each feature.
- **`src/lib/`**: Core application business logic.
  - **`iom.ts`, `po.ts`, `pr.ts`**: Backend functions for each module.
  - **`auth.ts`, `auth-utils.ts`**: NextAuth.js configuration and authorization helpers.
  - **`schemas.ts`**: Zod validation schemas.
- **`src/components/`**: Shared, reusable React components.
- **`prisma/`**: Database schema, migrations, and seed scripts.
- **`docs/`**: Contains detailed documentation about the system.

## Additional Documentation

For more in-depth information, please refer to the documents in the `docs/` directory:

- `SYSTEM_OVERVIEW.md`: A detailed look at the application's architecture and features.
- `PROPOSAL.md`: The original project proposal and roadmap.
- `01_database.md`: Information about the database schema and models.
- `02_auth.md`: Details on the authentication and authorization implementation.
- `03_testing.md`: The project's testing strategy.
- `04_configuration.md`: Guidance on configuring the application.
- `05_dashboard_analytics.md`: Information on the dashboard and analytics features.
- `06_user_management.md`: Details on user and role management.