# NexusProcure: Frontend Page Analysis

This document details the structure and data flow of the main pages in the application.

## Core Patterns

The frontend pages, located in `src/app`, follow a set of consistent patterns that make the application robust and maintainable.

1.  **`"use client"`**: Most pages that display dynamic data or require user interaction are Client Components.
2.  **Layout**: Nearly all pages are wrapped in the `<PageLayout>` component to ensure a consistent header, title, and page structure.
3.  **Authentication**: Pages are protected using the `useSession()` hook from `next-auth/react`. A standard pattern is employed:
    *   Check the `status` from `useSession`.
    *   While `status` is `"loading"`, display a `<LoadingSpinner />`.
    *   If `status` is `"unauthenticated"` (or the session is null), use `redirect('/login')` to send the user to the login page.
4.  **Data Fetching**: Data is fetched using the `useQuery` hook from `@tanstack/react-query`.
    *   Each query has a unique `queryKey`.
    *   The `queryFn` is typically an async function that uses `fetch` to call one of the application's internal API endpoints (e.g., `/api/dashboard`).
    *   The `enabled` option is often used to prevent a query from running until authentication is confirmed (e.g., `enabled: status === "authenticated"`).
    *   The `isLoading` and `isError` states from `useQuery` are used to render loading spinners or error messages.
5.  **Real-time Updates**: Pages that need real-time data (like the dashboard) use `useEffect` to subscribe to a Pusher channel. When an event is received, they use `queryClient.invalidateQueries({ queryKey: [...] })` to tell React Query to refetch the relevant data, which then automatically updates the UI.

---

## Example: `src/app/dashboard/page.tsx`

This page is a perfect example of all the core patterns in action.

*   **Purpose**: Displays a high-level overview of the system, including document counts, items pending approval, and a feed of recent activity.
*   **Data Flow**:
    1.  Component renders, `useSession` starts checking for an active session. A loading spinner is shown.
    2.  Once the session is confirmed, the `useQuery` for `dashboardData` is enabled.
    3.  `fetchDashboardData` is called, which makes a `GET` request to `/api/dashboard`.
    4.  While fetching, `isLoading` is true, so a loading spinner is shown within the page layout.
    5.  If the fetch fails, `isError` becomes true, and the `<ErrorDisplay>` component is rendered.
    6.  If the fetch succeeds, the `stats` object is populated, and the main UI (the grid of stats and the recent activity list) is rendered.
    7.  Simultaneously, a `useEffect` subscribes to the `dashboard-channel` on Pusher. If another user updates an IOM, the backend sends a `dashboard-update` event. This client receives the event and calls `queryClient.invalidateQueries({ queryKey: ["dashboardData"] })`, which triggers a silent refetch in the background to update the data.

## Other Key Pages

*   **/iom, /po, /pr**: These pages follow a similar pattern. They likely use `useQuery` to fetch a list of documents from their respective API endpoints (`/api/iom`, `/api/po`, etc.). They will also include components for searching, filtering, and pagination, which pass parameters to the `useQuery` hook to refetch the data with the correct filters.
*   **/iom/create, /po/create, etc.**: These are form-heavy pages. They will use the `useForm` hook from `react-hook-form` to manage form state, and Zod schemas (imported from `src/lib/schemas.ts`) for validation. On submission, they will call a mutation function (likely using `useMutation` from React Query) that makes a `POST` request to the appropriate API endpoint.
*   **/iom/[id], /po/[id], etc.**: These are detail pages. They will extract the ID from the URL, use it in a `useQuery` to fetch the specific document (`/api/iom/:id`), and display the detailed information. They will also contain buttons (e.g., "Approve", "Reject") that are conditionally rendered using `useHasPermission` and trigger `useMutation` hooks to call the `PATCH` endpoints.
*   **/dashboard/users, /dashboard/roles**: These are admin pages. They are protected by a top-level `useHasPermission` check. They use `useQuery` to fetch lists of users/roles and `useMutation` to handle creating, updating, or deleting them.
