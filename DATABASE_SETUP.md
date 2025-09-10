# Database Setup Guide

This project uses a hybrid database setup to facilitate development in different environments.

-   **Development Environment (AI-assisted):** Uses **SQLite** for simplicity and ease of setup.
-   **Your Environment (Local/Production):** Uses **PostgreSQL** for robustness and performance.

This guide explains how to work with this setup.

---

## Development Environment (AI)

When working with the AI, the project is configured to use SQLite out of the box.
- The `prisma/schema.prisma` file is set to use the `sqlite` provider.
- The `DATABASE_URL` in your `.env` file should point to a local database file, for example:
  `DATABASE_URL="file:./dev.db"`
- No further setup is required. The `npm install` command will automatically generate the correct Prisma client for SQLite.

---

## Production & Local PostgreSQL Setup (Your Environment)

When you are ready to run the application on your local machine or deploy it to a production server, you will use your existing PostgreSQL database. Here is the correct sequence of steps to get the application running with PostgreSQL.

**A Note on How This Works:** The project uses the main `prisma/schema.prisma` (configured for SQLite) as the single source of truth. The `npm run build` command automatically generates a temporary, PostgreSQL-compatible schema. The migration files in `prisma/migrations` are generated from the base SQLite schema, but because they contain standard SQL, they are compatible with PostgreSQL and can be safely applied to your production database.

### Step 1: Configure Environment Variables
In your target environment (either your local machine or production server), create a `.env` file or set the environment variables directly. The most important variable is `DATABASE_URL`, which must point to your PostgreSQL instance.

**Example `DATABASE_URL`:**
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DATABASE?schema=public"
```
*Replace the placeholders with your actual database credentials.*

### Step 2: Install Dependencies
If this is a fresh checkout, install all the necessary dependencies:
```bash
npm install
```

### Step 3: Seed the Database (First-Time Setup)
After installing dependencies, you must seed the database with the initial Roles and Permissions. This is a one-time setup step.
```bash
npx prisma db seed
```

### Step 4: Build the Application for Production
This is a critical step. The build command prepares the application to connect to PostgreSQL.

```bash
npm run build
```
**What this command does:**
1.  It runs a script that creates a temporary, production-only Prisma schema (`prisma/schema.prod.prisma`) with the database provider set to `postgresql`.
2.  It runs `prisma generate` using this temporary schema to create a PostgreSQL-compatible Prisma Client.
3.  It builds the Next.js application.

### Step 4: Create Database Schema
After the build is complete, you can create the tables in your PostgreSQL database. For an initial setup, the simplest command is `prisma db push`.

```bash
npx prisma db push --schema=prisma/schema.prod.prisma
```
This command will inspect the production schema file and make your database schema match it. This is the recommended approach for the first-time setup of your database.

**Important Note:** The `db push` command is best for prototyping and initial setup. For updating a database that already contains important data in production, you should use a proper migration strategy with `prisma migrate`. However, that requires generating migrations against a PostgreSQL database, which is outside the scope of the current AI-assisted workflow.

### Step 5: Start the Application
Now you can start the application server, which will use the production-ready build and connect to your PostgreSQL database.
```bash
npm start
```
The application is now running and connected to your PostgreSQL database.

---
*Note: You do not need to use Docker for this setup, as you are using your own existing PostgreSQL instances.*
