# NexusProcure: Authentication & Authorization Deep Dive

This document details the end-to-end authentication (AuthN) and authorization (AuthZ) flow within the NexusProcure application.

## 1. Authentication (AuthN)

Authentication is handled by **NextAuth.js (v5)**. The core configuration is located in `src/lib/auth-config.ts`.

### 1.1. Strategy & Provider

*   **Session Strategy**: The application uses the `jwt` strategy (`session: { strategy: "jwt" }`). This is a stateless approach where the user's session, role, and permissions are encoded into a secure, signed JSON Web Token. The JWT is stored in a cookie and sent with every request, avoiding the need for database session lookups on every action.
*   **Provider**: The primary provider is `Credentials`. This means NexusProcure manages its own user database with hashed passwords, and users log in with an email/password combination.

### 1.2. The Login Flow

1.  **User Submits Credentials**: The user enters their email and password on the `/login` page.
2.  **API Call**: The form submits to the `POST /api/auth/signin/credentials` endpoint, which is handled by NextAuth.js.
3.  **`authorize` Function**: The `authorize` function within `auth-config.ts` is triggered.
    *   It validates the incoming `email` and `password` fields using a Zod schema.
    *   It finds the user in the database via `prisma.user.findUnique({ where: { email } })`.
    *   If the user exists, it uses `bcrypt.compare` to securely check if the provided password matches the hashed password in the database.
    *   If the credentials are valid, it returns a minimal user object (e.g., `{ id: user.id }`).
4.  **JWT Creation**: Upon successful authorization, NextAuth.js begins creating a JWT.

### 1.3. JWT & Session Callbacks

The `callbacks` in `auth-config.ts` are critical for enriching the JWT and session with necessary data.

*   **`jwt({ token, user })` callback**:
    *   This callback is triggered whenever a JWT is created or updated.
    *   On initial sign-in (when the `user` object from the `authorize` function is present), it performs a crucial action: it fetches the **full user object from the database, including their role and all associated permissions**.
    *   It then injects this data into the token. The final token payload contains:
        *   `token.id`: The user's ID.
        *   `token.role`: The full `Role` object.
        *   `token.permissions`: A simple array of permission strings (e.g., `['CREATE_PO', 'APPROVE_PR']`).
*   **`session({ session, token })` callback**:
    *   This callback runs when the client requests the session (e.g., via `useSession()`).
    *   It populates the `session.user` object with the data from the JWT `token`.
    *   This makes `session.user.id`, `session.user.role`, and `session.user.permissions` available throughout the application.

## 2. Authorization (AuthZ)

Authorization is enforced on both the backend (API routes and business logic) and the frontend (UI components).

### 2.1. Backend Authorization: `authorize()`

*   **Location**: `src/lib/auth-utils.ts`
*   **Function**: `authorize(session: Session | null, requiredPermission: string)`
*   **Usage**: This function is the gatekeeper for all sensitive backend operations. It is called at the beginning of API handlers or business logic functions.
*   **Logic**:
    1.  It first checks if a valid `session` exists. If not, it throws an error.
    2.  It has a special-case for the **ADMIN** role: `if (user.role?.name === 'ADMIN') { return true; }`. This grants admins universal access, bypassing specific permission checks.
    3.  For all other users, it checks if the `session.user.permissions` array (which came from the JWT) `includes()` the `requiredPermission`.
    4.  If the permission is not found, it throws an error, which is caught by the API route and typically returned as a `403 Forbidden` or `500 Internal Server Error`.

### 2.2. Frontend Authorization: `useHasPermission()`

*   **Location**: `src/hooks/useHasPermission.ts`
*   **Hook**: `useHasPermission(permission: string): boolean`
*   **Usage**: This hook provides a simple way for React components to check if the current user has a specific permission.
*   **Logic**:
    1.  It uses the `useSession()` hook from `next-auth/react` to access the session data.
    2.  It retrieves the `permissions` array from `session.user.permissions`.
    3.  It returns `true` or `false` based on whether the array includes the requested permission.

This hook is used extensively to implement a **permission-driven UI**. For example, in `DashboardHeader.tsx`, it is used to conditionally render navigation links:

```jsx
// Example from DashboardHeader.tsx
const canManageUsers = useHasPermission('MANAGE_USERS');
const navLinks = [
  // ...
  { href: "/dashboard/users", text: "Users", show: canManageUsers },
  // ...
];
```

This prevents users from even seeing links to pages they are not authorized to access, creating a clean and secure user experience.
