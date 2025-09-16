# NexusProcure: Configuration & Environment Variables

This document lists all the necessary environment variables required to run the NexusProcure application. These should be placed in a `.env.local` file in the root of the project for local development.

---

## 1. Database

### `DATABASE_URL`
The connection string for the Prisma database. For local development with SQLite, this is handled automatically. For production, this should point to your hosted database instance.
*   **Example**: `postgresql://user:password@host:port/database?sslmode=require`

## 2. Authentication (NextAuth.js)

### `NEXTAUTH_SECRET`
A secret string used to sign and encrypt JWTs and other tokens used by NextAuth.js. This should be a long, random string. You can generate one with `openssl rand -base64 32`.
*   **Example**: `aVeryLongAndRandomStringForSecurity`

## 3. Email (Resend)

### `RESEND_API_KEY`
The API key for your Resend account, used for sending transactional emails (e.g., status updates).
*   **Example**: `re_12345678_123456789ABCDEF`

### `EMAIL_FROM`
The email address that will appear in the "From" field of all outgoing emails.
*   **Example**: `"NexusProcure <no-reply@yourdomain.com>"`

## 4. Real-time (Pusher)

These variables are for connecting to the Pusher service for real-time notifications and dashboard updates.

### Server-Side (Private)
These are used by the backend.

*   `PUSHER_APP_ID`: Your Pusher App ID.
*   `PUSHER_KEY`: Your Pusher Key.
*   `PUSHER_SECRET`: Your Pusher Secret.
*   `PUSHER_CLUSTER`: Your Pusher Cluster (e.g., `ap2`, `us3`).

### Client-Side (Public)
These are exposed to the browser. The `NEXT_PUBLIC_` prefix is a Next.js convention to make them available on the client side.

*   `NEXT_PUBLIC_PUSHER_KEY`: Same as `PUSHER_KEY`.
*   `NEXT_PUBLIC_PUSHER_CLUSTER`: Same as `PUSHER_CLUSTER`.
