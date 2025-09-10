# NexusProcure - IT Procurement Management System

This is a comprehensive IT procurement management system built with Next.js, Prisma, and PostgreSQL.

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

### 3. Set Up the Database

This project uses a hybrid database setup:
-   **SQLite** is used for local development within this AI-assisted environment.
-   **PostgreSQL** is used for production.

The project is configured to handle this automatically. When you run `npm install`, the environment is set up for SQLite. When you run `npm run build`, the application is prepared for a PostgreSQL database.

-   **For detailed instructions** on how to set up a PostgreSQL database for production or for testing a production build locally, please see the **[Migration Guide](./MIGRATION_GUIDE.md)**.

### 4. Configure Environment Variables

You need to create a `.env` file to store your local environment variables.

1.  Make a copy of the example file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and fill in the required values for your environment (e.g., `NEXTAUTH_SECRET`, `PUSHER_SECRET`, etc.). The `DATABASE_URL` should already be configured for the local Docker setup.

### 5. Run the Development Server

Once your database is running and your `.env` file is configured, you can start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
