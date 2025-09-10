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

When you are ready to run the application on your local machine or deploy it to your company's server, you will use your existing PostgreSQL database. The project is designed to make this transition seamless.

### How It Works
You do **not** need to manually change any code to switch databases.
- The `npm run build` command automatically triggers a script that creates a production-ready Prisma schema configured for **PostgreSQL**.
- The build process then uses this new schema to generate the correct Prisma client for your production application.

### Step 1: Configure Your Database Connection
In your production environment (or on your local machine), set the `DATABASE_URL` environment variable to point to your PostgreSQL instance.

**Example:**
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DATABASE?schema=public"
```
Replace the placeholders with your actual database credentials.

### Step 2: Run Production Migrations
Before you run the application for the first time, you need to create the database tables in your PostgreSQL database.

Run the following command in your terminal:
```bash
npx prisma migrate deploy --schema=prisma/schema.prod.prisma
```
This command will apply all existing migrations to your PostgreSQL database.

### Step 3: Build and Run the Application
1.  **Build the application:**
    ```bash
    npm run build
    ```
    This command prepares the app for production, including generating the PostgreSQL-compatible Prisma client.

2.  **Start the server:**
    ```bash
    npm start
    ```
The application will now be running connected to your PostgreSQL database.

---
*Note: You do not need to use Docker for this setup, as you are using your own existing PostgreSQL instances.*
