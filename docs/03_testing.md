# NexusProcure: Testing Strategy

This document outlines the testing strategy, tools, and patterns used in the NexusProcure application.

## 1. Tooling

*   **Test Runner**: [Vitest](https://vitest.dev/) is the primary test runner, chosen for its speed and compatibility with Vite and Next.js. It provides capabilities for running tests, generating coverage reports, and mocking.
*   **Component Testing**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) is used for rendering and interacting with React components in a way that resembles how a user would interact with them.
*   **Mocking**: [Vitest's built-in mocking capabilities](https://vitest.dev/guide/mocking.html) (`vi.mock`, `vi.fn`) are used extensively to isolate code and mock dependencies like database calls, external services, and Next.js features.

## 2. How to Run Tests

To run the entire test suite, use the following command from the project root:

```bash
npm test
```

## 3. Testing Philosophy

The testing strategy is pragmatic, focusing on testing behavior rather than implementation details. It is broken down into two main categories: Backend/Business Logic Testing and Frontend/Component Testing.

### 3.1. Backend / Business Logic Testing

This focuses on the functions within the `src/lib/` directory (e.g., `iom.ts`, `po.ts`), which contain the core business logic of the application.

*   **Approach**: These are treated as **integration tests for the business logic layer**. The functions are called directly within the tests, but the external layers they depend on (like the database and other services) are mocked. This allows for fast, reliable tests that validate the logic in isolation.
*   **Mocking Strategy**:
    *   **Database (`@/lib/prisma`)**: The entire Prisma client is mocked using `vi.mock('@/lib/prisma', ...)` to avoid hitting a real database. Test cases then provide mock resolved or rejected values for functions like `prisma.iOM.create` to simulate different database scenarios. The `Prisma.PrismaClientKnownRequestError` is used to test how the logic handles specific database errors, like unique constraint violations.
    *   **Authorization (`@/lib/auth-utils`)**: The `authorize` function is mocked to simulate whether a user has the required permission for an action, allowing tests to verify that the business logic correctly protects sensitive operations.
    *   **Side Effects (`@/lib/email`, `@/lib/notification`, `@/lib/audit`)**: Any function that causes a side effect (like sending an email or creating a notification) is mocked. The tests then assert that these functions were called with the correct arguments, verifying that the business logic triggers the appropriate side effects without actually executing them.
*   **Example (`src/lib/po.test.ts`)**:
    *   Tests that `createPurchaseOrder` calls `authorize` with the `CREATE_PO` permission.
    *   Tests that `getPOs` builds the correct Prisma `where` clause based on whether a user has the `READ_ALL_POS` permission.
    *   Tests that `updatePOStatus` correctly calls the notification and audit log functions after a status change.

### 3.2. Frontend / Component Testing

This focuses on the React components within `src/components/` and pages within `src/app/`.

*   **Approach**: Components are tested from a user's perspective. The tests render the component, simulate user interactions (clicking buttons, filling out forms), and assert that the UI updates as expected. This is done using `@testing-library/react`.
*   **Mocking Strategy**:
    *   **API Calls (`fetch`)**: The global `fetch` function is mocked using `vi.fn()` to simulate API responses. This allows testing of how a component handles different server responses (e.g., success, validation error, server error) without needing a live backend.
    *   **Routing (`next/navigation`)**: The `useRouter` hook from Next.js is mocked to provide a fake router instance. This allows tests to verify that navigation actions (like `router.push('/dashboard')`) are triggered correctly after a successful operation.
    *   **Authentication (`next-auth/react`)**: For pages or components that require authentication, the `useSession` hook is mocked to provide a simulated user session, including roles and permissions.
*   **Example (`src/components/CreateUserForm.test.tsx`)**:
    *   Renders the form and asserts that all input fields are present.
    *   Uses `@testing-library/react`'s `userEvent` to simulate a user typing into the input fields and clicking the "Create User" button.
    *   Asserts that a `fetch` call was made to the `/api/users` endpoint with the correct user data in the payload.
    *   Simulates a successful API response and asserts that the router was called to redirect the user.
    *   Simulates a failed API response and asserts that an error message is displayed to the user.