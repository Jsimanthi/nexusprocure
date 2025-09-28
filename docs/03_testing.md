# NexusProcure: Testing Strategy

This document outlines the testing strategy, tools, and patterns used in the NexusProcure application.

## 1. Tooling

*   **Test Runner**: [Vitest](https://vitest.dev/) is the primary test runner, chosen for its speed and compatibility with Vite and Next.js.
*   **Component Testing**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) is used for rendering and interacting with React components in a way that resembles a real user.
*   **Mocking**: [Vitest's built-in mocking capabilities](https://vitest.dev/guide/mocking.html) (`vi.mock`, `vi.fn`) are used extensively to isolate code and mock dependencies.

## 2. Testing Philosophy

The testing strategy is pragmatic, focusing on testing behavior rather than implementation details. It can be broken down into two main categories: Backend/Business Logic Testing and Frontend/Component Testing.

### 2.1. Backend / Business Logic Testing

This focuses on the functions within the `src/lib/` directory (e.g., `iom.ts`, `po.ts`).

*   **Approach**: These are treated as **integration tests for the business logic layer**. The functions are called directly, but the layers they depend on (like the database and external services) are mocked.
*   **Mocking Strategy**:
    *   **Database (`@/lib/prisma`)**: The entire Prisma client is mocked using `vi.mock`. Functions like `prisma.iOM.create` or `prisma.user.findMany` are spied on or given mock implementations for each test case. This ensures tests are fast and do not require a running database. The `Prisma.PrismaClientKnownRequestError` is used to simulate specific database errors, like unique constraint violations.
    *   **Authorization (`@/lib/auth-utils`)**: The `authorize` function is mocked to return `true` for successful cases or to throw an error for authorization failure cases. This allows testing of the permission-checking logic without a full authentication flow.
    *   **Side Effects (`@/lib/email`, `@/lib/notification`, `@/lib/audit`)**: Any function that causes a side effect (like sending an email or creating a notification) is mocked. The tests then assert that these functions were called with the correct arguments, but the actual implementation is not executed.
*   **Example (`src/lib/iom.test.ts`)**:
    *   Tests that `createIOM` calls `authorize` with the correct permission (`CREATE_IOM`).
    *   Tests that `getIOMs` builds the correct Prisma `where` clause based on the user's role (e.g., `Administrator` vs. `Procurement Officer`).
    *   Tests that `updateIOMStatus` correctly logs the audit trail for a status change.

### 2.2. Frontend / Component Testing

This focuses on the React components within `src/components/` and pages within `src/app/`.

*   **Approach**: Components are tested from a user's perspective. The tests render the component, simulate user actions, and assert that the UI updates as expected.
*   **Mocking Strategy**:
    *   **API Calls (`fetch`)**: The global `fetch` function is mocked to simulate API responses. This allows testing of how a component handles different server responses (e.g., success, validation error, server error) without needing a live backend.
    *   **Routing (`next/navigation`)**: The `useRouter` hook from Next.js is mocked to provide a fake router instance. This allows tests to verify that navigation actions (like `router.push('/dashboard')`) are triggered correctly after a successful operation.
    *   **Authentication (`next-auth/react`)**: While not shown in the analyzed `CreateUserForm.test.tsx`, pages that use `useSession` would require this hook to be mocked to simulate an authenticated or unauthenticated user.
*   **Example (`src/components/CreateUserForm.test.tsx`)**:
    *   Renders the form and asserts that all input fields are present.
    *   Uses `fireEvent` to simulate a user filling out the form.
    *   Simulates a click on the "Create User" button.
    *   Uses `waitFor` to wait for asynchronous actions to complete.
    *   Asserts that `fetch` was called with the correct endpoint (`/api/users`) and payload.
    *   Asserts that on a successful API response, the router is called to redirect the user.
    *   Asserts that on a failed API response, an error message is displayed to the user.
