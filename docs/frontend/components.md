# NexusProcure: Frontend Component Analysis

This document details the key reusable components that form the building blocks of the NexusProcure UI.

## Core Components

### 1. `PageLayout.tsx`

This is the main layout wrapper for almost every page in the application.

*   **Purpose**: To provide a consistent visual structure, including the header, background color, and content padding.
*   **Props**:
    *   `title: string`: The title to be displayed in a large `<h1>` tag at the top of the content area.
    *   `children: React.ReactNode`: The main content of the page.
*   **Composition**: It renders the `<DashboardHeader />` at the top and then wraps the `children` in a styled `div`.

### 2. `DashboardHeader.tsx`

A complex, stateful component that serves as the primary navigation header.

*   **Purpose**: To display the application logo, main navigation links, user information, and action buttons like Logout and Notifications.
*   **State**:
    *   `isMobileMenuOpen: boolean`: Manages the visibility of the mobile navigation menu.
*   **Hooks**:
    *   `useSession()`: To get the current user's name for the welcome message.
    *   `usePathname()`: To determine the current page's path for highlighting the active navigation link.
    *   `useHasPermission()`: **Crucially**, this is used to conditionally filter the `navLinks` array, ensuring that links like "Users" and "Roles" are only rendered if the user has the appropriate permissions (`MANAGE_USERS`, `MANAGE_ROLES`).
*   **Actions**:
    *   Contains the "Logout" button which calls `signOut()` from `next-auth/react`.
*   **Composition**: It renders the `<Notifications />` component.

### 3. `Notifications.tsx`

Handles the display of the notification bell icon and dropdown.

*   **Purpose**: To provide users with real-time updates and messages.
*   **Data Flow**:
    *   Uses `useQuery` to fetch initial notifications from `GET /api/notifications`.
    *   Subscribes to a private Pusher channel (`private-user-USERID`) to listen for `new-notification` events.
    *   When an event is received, it invalidates the notifications query to refetch and display the latest data.
*   **Actions**:
    *   Contains buttons that trigger `useMutation` hooks to call `PATCH /api/notifications/:id` (to mark one as read) and `POST /api/notifications/mark-all-read`.

### 4. `SearchAndFilter.tsx`

A likely component (based on UI patterns) for handling list filtering.

*   **Purpose**: To provide a unified UI for searching, filtering by status, and pagination for the IOM, PO, and PR list pages.
*   **Props**: It would accept callback functions (`onSearch`, `onFilterChange`, `onPageChange`) to lift the state up to the parent page component.
*   **State**: Manages the internal state of the search input and filter dropdowns. When a value changes, it calls the appropriate callback prop. The parent page then uses this new value to refetch its data via `useQuery`.

### 5. Form Components (`CreateUserForm.tsx`, `EditRoleForm.tsx`, etc.)

These components encapsulate form logic.

*   **Purpose**: To provide a dedicated UI for creating or editing a specific resource.
*   **Hooks**:
    *   `useForm()`: From `react-hook-form` to manage form state, validation, and submission.
    *   `zodResolver()`: To connect Zod schemas from `src/lib/schemas.ts` to the form for validation.
    *   `useMutation()`: From React Query to handle the API call on form submission. This provides `isLoading`, `isError`, and `isSuccess` states for the submission process, allowing the UI to display loading indicators on the submit button and show success/error messages.

### 6. Common Utility Components

*   **`LoadingSpinner.tsx`**: A simple, reusable spinner component shown during loading states.
*   **`ErrorDisplay.tsx`**: A component that displays a formatted error message. It accepts a `title`, `message`, and an optional `onRetry` function, which can be connected to the `refetch` function from `useQuery`.
*   **`BackButton.tsx`**: A simple component that provides a "Back" link for easy navigation.
*   **`LogoutButton.tsx`**: A dedicated component for the logout action, likely for use on mobile or in different contexts than the main header.
*   **`FileUpload.tsx`**: A component likely built on top of `react-dropzone` to handle the file selection UI and the call to `POST /api/upload`.
