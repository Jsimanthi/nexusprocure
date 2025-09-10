# NexusProcure Improvement Roadmap

This document outlines the key recommendations to enhance the application's security, scalability, and maintainability, moving it towards a world-class standard. This list is based on the analysis performed on Sept 10, 2025.

---

### 1. High Priority: Granular Role-Based Access Control (RBAC)
- **Observation:** The current authorization logic is basic, typically checking for a single `MANAGER` or `ADMIN` role (e.g., `authorize(session, Role.MANAGER)`). This is a coarse-grained approach.
- **Recommendation:** Implement a more fine-grained Role-Based Access Control (RBAC) system. Define specific permissions (e.g., `iom:create`, `iom:approve`, `vendor:edit`) and assign them to roles. The authorization logic should then check for these specific permissions rather than a general role. This will make the system more secure and flexible, allowing for the creation of new roles (e.g., 'Accountant', 'Department Head') with specific sets of permissions without changing the core business logic.

### 2. Medium Priority: Enhanced Testing Strategy
- **Unit Test Depth:** While test files exist, their depth and coverage should be systematically reviewed. A world-class application requires tests that cover not just the "happy path" but also all edge cases, error conditions, and logical branches within the business logic.
- **End-to-End (E2E) Testing:** The project currently lacks an E2E testing suite. Introduce a framework like **Playwright** to automate tests for critical user workflows. Example test cases would include: "A user can create and submit an IOM," "An approver can approve an IOM, which can then be converted to a PO," and "The search and filter functionality returns the correct results." E2E tests are crucial for preventing regressions in user-facing functionality.

### 3. Medium Priority: Advanced Dashboard Features
- **Observation:** The core functionality for the procurement workflow is in place, but the main dashboard is an area with significant potential for growth.
- **Recommendation:** Expand the dashboard to provide more at-a-glance insights and analytics as envisioned in the original `plan.MD`. This could include summary cards ("Total Pending Approvals," "My Open Requests"), charts visualizing spending by category or vendor over time, and a list of recent activities. This would transform the dashboard from a simple navigation page into a powerful decision-making tool.

### 4. Low Priority: Configuration and Documentation
- **Developer Onboarding:** To improve the developer experience and streamline setup, create a `.env.example` file in the root of the repository. This file should list all required environment variables (e.g., `DATABASE_URL`, `NEXTAUTH_SECRET`, `PUSHER_APP_ID`) with placeholder values.
- **Documentation:** The project's documentation (`README.md`, `IMPROVEMENTS.md`) is out of date. The `README.md` should be updated to include project-specific information, setup instructions, and an overview of the architecture. The `IMPROVEMENTS.md` file should be archived or updated to reflect the current state of the project to avoid confusion for new developers.
