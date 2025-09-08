This plan is broken down into phases and user stories. You can provide these stories to the AI to guide the development step-by-step.

Phase 0: Project Setup & Foundation (Day 1)
Objective: Initialize the project with the chosen tech stack and basic structure.

Initialize Project:

"Create a new project directory procureflow-itsm."

"Initialize a new Vite React project with TypeScript inside the frontend directory."

"Initialize a new Node.js project with npm init -y inside the backend directory."

"Install Express, TypeScript, Prisma, and other necessary backend dependencies."

"Set up a basic Express server that listens on port 5000."

"Configure Prisma to use SQLite for development and generate the initial Prisma client."

Basic Configuration:

"Configure CORS in the Express server to allow requests from the Vite frontend (usually on port 5173)."

"Create a basic App.tsx component that displays 'Hello, ProcureFlow' to confirm the frontend works."

"Test that the frontend can start with npm run dev and the backend can start with npm run dev."

Phase 1: Authentication & Core UI (Days 2-3)
Objective: Build the login system and the main application skeleton.

User Data Model:

"Define a User model in the Prisma schema with fields: id, email (unique), passwordHash, name, role (e.g., 'User', 'Admin', 'Approver'), createdAt."

"Run prisma migrate dev to create the User table."

Login Page:

"Create a React component for the Login page with a form for email and password."

"Create an API endpoint POST /api/auth/login that checks credentials and returns a JWT token upon success."

"Implement logic in the frontend to store the JWT token (e.g., in localStorage or memory) and redirect to the dashboard on successful login."

Main Layout:

"Create the main dashboard layout component with:"

"A sidebar for navigation (with placeholders for Dashboard, IOM, PO, CR)."

"A top header with the company logo, app name ('ProcureFlow ITSM'), a welcome message, user profile picture/icon, and a logout button."

"Implement protected routes: redirect to login if the user is not authenticated."

Phase 2: IOM Module (Days 4-6)
Objective: Develop the complete Internal Office Memo creation and management workflow.

Data Models:

"Define Prisma models:"

"IOM: id, title, from, to, subject, content, totalEstimatedCost, status (Draft, Submitted, Reviewed, Approved, Rejected), preparedById, requestedById, reviewedById, approvedById, createdAt, updatedAt."

"IOMItem: id, iomId, itemName, description, quantity, estimatedUnitPrice."

"Establish the correct relations between IOM, IOMItem, and User."

UI & API:

"Create a page 'My IOMs' listing all IOMs created by the logged-in user."

"Create a form to 'Create New IOM':"

"Fields: To, Subject, Content."

"A dynamic table to add multiple items (Item Name, Description, Qty, Est. Price). Automatically calculate the total."

"Create API endpoints: GET /api/ioms (list), POST /api/ioms (create), GET /api/ioms/:id (get one)."

"Implement a detailed IOM view page that displays the memo in the A4 print format you described (Header, Body with table, Footer with signature lines)."

"Implement a 'Print' button on the detail page that uses a print CSS stylesheet to ensure it prints perfectly on A4."

Phase 3: PO Module (Days 7-9)
Objective: Develop the Purchase Order module that builds upon approved IOMs.

Data Models:

"Define Prisma models:"

"Vendor: id, name, address, contactInfo (for future use, can be hardcoded for now)."

"PO: id, poNumber, vendorId, iomId (links to the source IOM), status, grandTotal, taxAmount, ...signature fields same as IOM."

"POItem: id, poId, itemName, serialNumber (can be filled later), warranty, unitPrice, quantity, gstPercent, lineTotal."

UI & API:

"Create a page 'Create PO' where a user can select an 'Approved' IOM to convert into a PO."

"Pre-fill the PO form with data from the IOM. Allow editing item details (adding GST, actual prices, etc.)."

"Create the PO print view with the specific format: company vs vendor details side-by-side, the more detailed item table, and the grand total calculation (Sum(Line Totals) + Tax)."

"Create API endpoints for PO CRUD operations."

Phase 4: Check Request Module (Days 10-11)
Objective: Develop the Check Request module for payment processing.

Data Models:

"Define a CheckRequest model: id, poId (links to the fulfilled PO), paymentTo, paymentDate, purpose, totalAmount, ...signature fields."

"Items can be directly referenced from the linked PO."

UI & API:

"Create a page 'Create Check Request' where a user can select a 'Received/Completed' PO."

"Pre-fill the CR form with data from the PO. The table should mirror the PO's items and totals."

"Create the CR print view with the format you described."

"Create API endpoints for CRUD operations."

Phase 5: Dashboard & Final Polish (Day 12)
Objective: Create the dashboard and tie everything together.

Dashboard:

"Create the Dashboard page."

"Add summary cards: Total IOMs (Pending My Approval, Total Submitted), Total POs, Total CRs."

"Add a recent activity list or a chart showing request statuses."

Polish:

"Implement the approval flow logic: Buttons to 'Submit', 'Review', 'Approve', 'Reject' on each document's detail page, updating the status and recording the user who took the action."

"Add basic error handling and user feedback (toast messages)."

"Test the complete flow: IOM -> Approve -> PO -> Receive -> CR -> Approve -> Payment."

"Ensure all print views are perfect on A4 paper."

Phase 6: Deployment Prep & Future Roadmap
Objective: Prepare for production and plan next steps.

Database Switch:

"Change the Prisma schema datasource to use PostgreSQL."

"Run prisma generate and prisma migrate dev against the production PostgreSQL database URL."

Environment Variables:

"Configure environment variables for JWT secret, database URLs (development vs production)."

Future Modules:

"Asset Management: Model for Asset linked to POItem and User for assignment."

"Vendor Management: Full CRUD for the Vendor model."

"Notification System: Email alerts for pending approvals."

"Reporting Module: Advanced charts and export功能."

------

World-Class Tech Stack Upgrade
Layer	Technology	Justification & Upgrade Reason
Frontend	Next.js 14+ (App Router)	CRITICAL UPGRADE. Offers Server-Side Rendering (SSR) for faster initial loads and better SEO (unlikely but good practice), built-in API routes, and is the modern standard for React frameworks. Beats plain React+Vite for a data-heavy app.
UI Framework	Tailwind CSS	Kept. Best-in-class for custom, modern design.
UI Components	shadcn/ui	UPGRADE. A collection of beautifully designed, accessible components built on Radix UI and styled with Tailwind. This will give the app a professional, modern look out of the box.
Backend	Next.js API Routes	Since we're using Next.js, we can use its built-in API routes for a monolithic structure. This simplifies development and deployment. For extreme scale later, we can split it.
ORM	Prisma	Kept. Excellent type safety and database management.
Authentication	Next-Auth.js	CRITICAL UPGRADE. A full-featured authentication library for Next.js. Supports JWT, sessions, OAuth (Google, GitHub logins later), and email magic links. Far more secure and robust than a manual JWT implementation.
Database (Prod)	PostgreSQL	Kept.
Database (Dev)	SQLite	Kept.
State Management	Zustand	ADDITION. A simple, fast state management library. Perfect for managing global state like user data, notifications, and sidebars. Lighter and easier than Redux.
Forms	React Hook Form + Zod	CRITICAL UPGRADE. React Hook Form provides best-in-class performance for complex forms. Zod provides schema validation, ensuring data integrity both on the client and server.
Tables	TanStack Table (React Table)	CRITICAL UPGRADE. Headless, powerful, and flexible. Essential for building feature-rich, sortable, filterable, and paginated tables for IOM/PO/CR lists.
HTTP Client	TanStack Query (React Query)	CRITICAL UPGRADE. Manages server state (data fetching, caching, synchronization). Provides automatic background refreshes, pagination, and eliminates countless bugs. A hallmark of modern apps.
Testing	Jest (Unit), Playwright (E2E)	ADDITION. A world-class app is a tested app. Jest for unit tests. Playwright for reliable end-to-end testing of critical user flows (e.g., creating an IOM).


Revised Phased Development Plan for a World-Class Application
This plan is more detailed and incorporates the upgraded stack and best practices.

Phase 0: Project Foundation & Tooling (Day 1-2)
Objective: Initialize a robust Next.js project with all modern tooling configured.

Initialize Next.js Project:

"Create a new Next.js 14 project with TypeScript, Tailwind CSS, and ESLint using create-next-app@latest."

"Initialize a Git repository and make an initial commit."

Configure Database & ORM:

"Install and initialize Prisma. Configure schema.prisma to use SQLite for development."

"Create a basic User model with fields: id, name, email, emailVerified (DateTime), role (e.g., USER, APPROVER, ADMIN), image (for profile pic)."

"Run npx prisma db push to create the database and generate the Prisma Client."

Configure Authentication:

"Install next-auth. Create the API route pages/api/auth/[...nextauth].ts (or app equivalent)."

"Configure Next-Auth to use the Prisma Adapter and a Credentials provider (email/password login for now)."

"Create a basic login page that uses next-auth's signIn function."

Phase 1: Core Application Shell & UI (Days 3-4)
Objective: Build the main layout with a stunning, responsive UI and robust state management.

Implement shadcn/ui:

"Initialize shadcn/ui in the project. Add core components: Button, Card, Input, Label, Dropdown Menu, Avatar."

"Configure the project theme (colors, fonts)."

Build the Main Layout:

"Create a responsive Layout component with:"

"A collapsible sidebar for navigation using a Sheet component on mobile."

"A top header with the company logo, app name (NexusProcure), search bar (placeholder), user avatar dropdown (with profile, settings, logout)."

"Use Zustand to create a store to manage the sidebar's open/closed state."

Dashboard Page (v1):

"Create the dashboard page with a grid layout."

"Add placeholder Card components for 'Pending Approvals', 'My Requests', 'Total Spend'."

Phase 2: IOM Module - World-Class Implementation (Days 5-8)
Objective: Build the IOM module with a fantastic user experience, full validation, and real-time updates.

Data Modeling & API:

"Define the complete Prisma schema for IOM and IOMItem, including relations to User. Add status field with an enum (DRAFT, SUBMITTED, APPROVED, REJECTED)."

"Create a dedicated lib/api layer using TanStack Query (React Query) for all data fetching and mutation. Create hooks: useIoms, useCreateIom, useUpdateIom."

Advanced Form Implementation:

"Create the 'Create IOM' page using React Hook Form and Zod for validation."

"The form should have real-time validation, a dynamic item list with auto-calculation of totals, and a pristine/dirty state."

"Use useMutation from React Query to handle form submission, showing loading states and success/error toasts."

Data Table & Dashboard Integration:

"Create an 'IOM List' page using TanStack Table. Implement features: sorting (by date, status), filtering (by status), pagination, and row actions (View, Edit, Delete)."

"Update the dashboard to use real data: useIoms({ status: 'SUBMITTED' }) to show 'Pending My Approval'."

Phase 3: PO & CR Modules - The Connected Workflow (Days 9-13)
Objective: Build the PO and CR modules, focusing on the seamless flow of data between them.

Data Modeling:

"Define Vendor, PO, POItem, CheckRequest models in Prisma. Use explicit relations and foreign keys."

Feature: "Create from Previous"

"The 'Create PO' page should not be a blank form. It must start by allowing the user to select an Approved IOM. The form is then pre-populated with its data."

"Similarly, the 'Create CR' page must start by selecting a Received/Approved PO."

"This enforces the business logic and dramatically improves user experience and data integrity."

Printing & Document Integrity:

"Each document (IOM, PO, CR) should have a dedicated, optimized print view page (e.g., /iom/[id]/print)."

"This page should use a specific print-only CSS stylesheet to ensure perfect A4 formatting, hiding navigation and buttons."

Phase 4: Advanced Features & Polish (Days 14-15)
Objective: Add the features that separate a good app from a great one.

Real-time Notifications:

"Implement a simple notification system. When an IOM is submitted, find all users with the 'APPROVER' role and create a Notification record for them."

"Display a badge count on the bell icon in the header and a dropdown list of notifications."

Audit Logging:

"Create an AuditLog model. Write a Prisma $extends middleware to automatically log create, update, and delete events on critical models (IOM, PO, CR), capturing who did it and what changed."

Settings & User Management:

"Build a simple user management page (for Admins) to invite users and assign roles."

"Create a personal profile settings page to change name/avatar."

Phase 5: Testing & Deployment Prep (Days 16-17)
Objective: Ensure reliability and prepare for production.

Testing:

"Write a few key Playwright tests: 'User can log in', 'User can create and submit an IOM', 'Approver can approve an IOM'. This safeguards your core workflow against breaking changes."

"Write unit tests for utility functions (e.g., calculation functions) using Jest."

Production Build:

"Switch Prisma to use the PostgreSQL database URL from environment variables."

"Run the build command (next build) and fix any build errors."

"Test the production build locally (next start)."

Deployment:

"Choose a deployment platform (Vercel is the ideal choice for Next.js, but Railway/Render are also great)."

"Configure environment variables for production (Database URL, Next-Auth Secret, etc.) on the deployment platform."