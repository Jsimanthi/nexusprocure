# Migration Guide: From SQLite to PostgreSQL

This guide provides step-by-step instructions to migrate the NexusProcure application database from SQLite to PostgreSQL.

## The Importance of Environment Parity

Using SQLite for development and PostgreSQL for production can lead to subtle bugs that are difficult to diagnose. Each database has different features, constraints, and behaviors. By using PostgreSQL for both development and production, you ensure that the application behaves identically in both environments. This principle, known as "environment parity," is a best practice for building reliable, world-class applications.

This guide will help you set up a local PostgreSQL instance using Docker, which is a simple and effective way to achieve environment parity.

## Prerequisites

- **Docker Desktop:** Make sure you have Docker Desktop installed and running on your machine. You can download it from the [official Docker website](https://www.docker.com/products/docker-desktop/).

---

## Step 1: Set Up PostgreSQL with Docker

The easiest way to run a local PostgreSQL database is with Docker.

1.  **Create a `docker-compose.yml` file** in the root directory of the project with the following content:

    ```yml
    version: '3.8'
    services:
      db:
        image: postgres:15
        restart: always
        environment:
          - POSTGRES_USER=nexususer
          - POSTGRES_PASSWORD=nexuspassword
          - POSTGRES_DB=nexusprocure
        ports:
          - '5432:5432'
        volumes:
          - postgres_data:/var/lib/postgresql/data

    volumes:
      postgres_data:
    ```

2.  **Start the database container** by running the following command in your terminal from the project root:

    ```bash
    docker-compose up -d
    ```

    This command will download the PostgreSQL image and start a container in the background. Your local PostgreSQL database is now running.

## Step 2: Configure Environment Variables

The application connects to the database using a URL specified in an environment variable.

1.  **Create a `.env` file** in the project root. This file is listed in `.gitignore`, so it will not be committed to version control.

2.  **Add the database connection URL** to your new `.env` file. This URL must match the credentials you set in the `docker-compose.yml` file.

    ```env
    DATABASE_URL="postgresql://nexususer:nexuspassword@localhost:5432/nexusprocure?schema=public"
    ```

## Step 3: How the Database Schema is Handled

This project is configured to use **SQLite** for local development and **PostgreSQL** for production. This is handled automatically by the build process.

-   **For Development:** The `prisma/schema.prisma` file is configured for SQLite. When you run `npm install`, the `postinstall` script automatically generates the correct Prisma Client for SQLite.
-   **For Production:** When you run `npm run build`, a script automatically generates a production-ready schema (`prisma/schema.prod.prisma`) with the provider set to `postgresql`. The build process then uses this schema to generate the correct Prisma Client for PostgreSQL.

You do **not** need to manually edit the schema file.

## Step 4: Run the Production Database Migration

To set up your PostgreSQL database for the first time (for testing a production build locally or for deployment), you need to run a migration against it.

1.  Make sure your `.env` file has the correct `DATABASE_URL` for your PostgreSQL instance.
2.  Run the `prisma db push` or `prisma migrate deploy` command against the production schema. For a first-time setup, you can use:

    ```bash
    npx prisma migrate dev --schema=prisma/schema.prod.prisma --name init-postgres
    ```
    For subsequent production deployments, you should use:
    ```bash
    npx prisma migrate deploy --schema=prisma/schema.prod.prisma
    ```

## Step 5: Build and Start the Application

To run the application in a production-like mode connected to your PostgreSQL database:

1.  **Build the application:**
    ```bash
    npm run build
    ```
2.  **Start the server:**

```bash
npm run dev
```

The application will now connect to your local PostgreSQL database. You have successfully migrated your environment and achieved parity with a production-like setup.
