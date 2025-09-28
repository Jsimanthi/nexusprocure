# NexusProcure - IT Procurement Management System

This is a comprehensive IT procurement management system built with Next.js, Prisma, and PostgreSQL.

## Project Status (As of September 2025)

Significant progress has been made on the new Dashboard & Analytics module.

*   **Phase 1 (The Actionable & Personalized Hub) is complete.**
*   The dashboard now features **role-based views** for different user types (Admin, Manager, etc.).
*   The foundation for **customizable widgets** has been laid by refactoring the UI into a modular, widget-based architecture.
*   **Key Performance Indicators (KPIs)** like Average Approval Time, Procurement Cycle Time, and Emergency Purchase Rate have been implemented.
*   A **"Mark as Complete" workflow** has been added, allowing Finance Officers to finalize the entire procurement chain.
*   A **"Print All" feature** is now available on Payment Requests to easily print the full document history.
*   **Phase 2 (Advanced Analytics) has begun,** with the implementation of interactive "Spend Over Time" and "Spend by Category" charts with drill-down capabilities.

For a detailed breakdown of completed work and the project roadmap, please see the **[Project Proposal](./docs/PROPOSAL.md)**.

---

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

-   **For detailed instructions** on how to set up and connect to your PostgreSQL database for production, please see the **[Database Setup Guide](./DATABASE_SETUP.md)**.

### 4. Configure Environment Variables

You need to create a `.env` file to store your local environment variables.

1.  Make a copy of the example file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and fill in the required values for your environment (e.g., `NEXTAUTH_SECRET`, `PUSHER_SECRET`, etc.). For development, the `DATABASE_URL` should point to the local SQLite file (e.g., `file:./dev.db`).

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
