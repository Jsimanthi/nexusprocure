# NexusProcure System Analysis

This document provides a detailed analysis of the authentication, authorization, and session management systems in the NexusProcure application. The goal of this analysis is to identify the root cause of the persistent role misidentification issue and other related bugs.

## 1. Authentication Flow

The authentication flow is handled by the `next-auth` library, specifically using the `Credentials` provider. The process is defined in `src/lib/auth-config.ts`.

Here is a step-by-step breakdown:

1.  **User Submits Credentials**: The user enters their email and password on the login page (`/login`).
2.  **`Credentials` Provider**: The `Credentials` provider in `authConfig` receives the credentials.
3.  **`authorize` Function**: The `authorize` function is called with the submitted credentials.
    *   It first validates the email and password using a Zod schema (`credentialsSchema`).
    *   It then queries the database using `prisma.user.findUnique` to find a user with the matching email. The query also includes the user's `role` and the role's `permissions`.
    *   If the user is not found, `authorize` returns `null`, causing the login to fail.
    *   It then uses `bcrypt.compare` to compare the submitted password with the hashed password stored in the database.
    *   If the passwords do not match, `authorize` returns `null`, and the login fails.
    *   If the user is found and the password is correct, the `authorize` function returns a user object containing the user's ID, name, email, role, and a flattened list of permission names.

This flow appears to be correctly implemented and secure. The use of `bcrypt` for password hashing is a standard security practice.

## 2. Session Management

Session management is handled by the `jwt` and `session` callbacks in `src/lib/auth-config.ts`. The application is configured to use the JSON Web Token (JWT) session strategy (`session: { strategy: "jwt" }`).

Here's the flow:

1.  **`jwt` Callback**: After the `authorize` function successfully returns a user object, the `jwt` callback is invoked.
    *   It receives the `token` and the `user` object from the `authorize` function.
    *   It then transfers the `id`, `role`, and `permissions` from the `user` object to the `token`.
    *   This token is then encrypted and stored in a cookie.

2.  **`session` Callback**: On subsequent requests, the `session` callback is invoked.
    *   It receives the `session` object and the `token` (which was decoded from the cookie).
    *   It then transfers the `id`, `role`, and `permissions` from the `token` to the `session.user` object.
    *   This `session` object is what is made available to the frontend through the `useSession` hook and to the backend through the `auth()` function.

This process ensures that the user's role and permissions are securely stored in the session and are available throughout the application. The implementation of these callbacks appears to be correct.

## 3. Backend Authorization

Backend authorization is handled by the `authorize` function in `src/lib/auth-utils.ts`. This function is called at the beginning of API routes that perform protected actions.

Here's how it works:

1.  **Get Session**: The API route first gets the user's session using the `auth()` function from `next-auth`.
2.  **Call `authorize`**: The API route then calls the `authorize` function, passing the `session` and the name of the required permission (e.g., `'CREATE_IOM'`).
3.  **Permission Check**: The `authorize` function performs the following checks:
    *   It ensures that a valid session exists.
    *   It checks if the user's role is `ADMIN`. If it is, the function immediately returns `true`, granting access.
    *   If the user is not an admin, it checks if the `user.permissions` array (from the session) includes the `requiredPermission`.
    *   If the user has the permission, the function returns `true`.
    *   If the user does not have the permission, the function throws an error, which is then caught by the API route and returned as a `403 Forbidden` response.

This is a standard and secure way to implement RBAC on the backend. The special handling for the `ADMIN` role is a common and correct practice.

## 4. Frontend Authorization

Frontend authorization is handled by the `useHasPermission` custom hook, defined in `src/hooks/useHasPermission.ts`. This hook is used in various frontend components to conditionally render UI elements like buttons and links.

Here's how it works:

1.  **`useSession` Hook**: The `useHasPermission` hook calls the `useSession` hook from `next-auth/react` to get the current user's session.
2.  **Permission Check**: It then checks if the `session.user.permissions` array (which was populated by the `session` callback) includes the required permission.
3.  **Return Value**: The hook returns `true` if the user has the permission, and `false` otherwise.
4.  **Conditional Rendering**: In the frontend components (e.g., `src/app/iom/page.tsx`), the hook is called like this: `const canCreate = useHasPermission('CREATE_IOM');`. The `canCreate` variable is then used to conditionally render the "Create New IOM" button: `{canCreate && <button>...<button>}`.

This is a clean and effective way to implement UI-level authorization. The logic is centralized in the `useHasPermission` hook, making it easy to use and maintain.

## 5. Root Cause Analysis

After a thorough analysis of the authentication, session management, and authorization systems, the root cause of the role misidentification issue appears to be an unintended interaction between the `PrismaAdapter` and the `Credentials` provider in `next-auth`.

The `Credentials` provider is designed to work with an existing user database and does not require an adapter to function. The `PrismaAdapter`, on the other hand, is designed to automatically handle user creation and linking for OAuth providers (like Google, Facebook, etc.).

When both are used together, it seems the `PrismaAdapter` is interfering with the user object after a successful login with the `Credentials` provider. This interference is likely causing the user's `roleId` to be overwritten or nulled in the database, leading to the role misidentification issue.

The other issues, such as the 403 Forbidden errors and the empty IOM list, are all symptoms of this root cause.

## 6. Proposed Solution

The proposed solution is to remove the `PrismaAdapter` from the `authConfig` in `src/lib/auth-config.ts`.

The `Credentials` provider does not need the adapter to function, and removing it will eliminate the source of the conflict. The `authorize` function in the `Credentials` provider already handles all the necessary database interactions (finding the user, checking the password).

By removing the adapter, we simplify the authentication flow and ensure that the user's role is correctly fetched from the database and maintained throughout the session.

This single change should resolve all the reported issues, including the login failures, the role misidentification, the permission errors, and the empty lists.
