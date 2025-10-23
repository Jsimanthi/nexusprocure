# NexusProcure - Internal Procurement Management System

NexusProcure is a full-stack web application designed to streamline internal procurement workflows. It enables users to manage the entire lifecycle of a purchase, from an internal request to vendor payment, through a three-stage process: Inter-Office Memo (IOM), Purchase Order (PO), and PaymentRequest (PR).

## Features

- **End-to-End Procurement Workflow**: Manage the entire procurement lifecycle, from initial request (IOM) to purchase order (PO) and final payment (PR).
- **Role-Based Access Control (RBAC)**: A granular permissions system ensures that users can only access the features and data relevant to their roles.
- **Dashboard & Analytics**: An actionable, role-based dashboard provides key performance indicators (KPIs) and visualizations for spend analysis.
- **Multi-Level Approval Workflows**: Configure approval chains for IOMs, POs, and PRs to match your organization's policies.
- **Document Management**: Generate, view, and print PDFs for all procurement documents with optimized Playwright rendering.
- **Vendor Management**: Maintain a central database of vendors and track their performance with automated scoring.
- **System & Application Settings**: Administrators can configure application-wide settings and monitor system health.

## Enterprise Features (Recently Added)

- **🔄 Database Fallback**: Automatic PostgreSQL → SQLite fallback for uninterrupted development
- **⚡ Background Job Processing**: BullMQ with Redis for PDF generation and analytics computation
- **🔐 Enhanced Security**: Rate limiting, security headers, and comprehensive authentication
- **📊 Advanced Analytics**: Scheduled daily/weekly/monthly analytics with automated computation
- **🤖 Vendor Intelligence**: Performance scoring and recommendation engine
- **🔧 Workflow Engine**: Configurable approval workflows with audit trails
- **📈 Real-time Monitoring**: Structured logging with Pino and Sentry error tracking
- **🐳 Container Ready**: Docker and docker-compose setup for easy deployment
- **🚀 CI/CD Pipeline**: GitHub Actions with automated testing and security scanning

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Development), PostgreSQL (Production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (JWT Session Strategy)
- **Styling**: Tailwind CSS
- **State Management**: React Query (Server State), Zustand (Client State)
- **Forms**: React Hook Form with Zod for validation
- **Testing**: Vitest and React Testing Library

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

### 3. Configure Environment Variables

The `.env` file is already configured with the following variables:

```env
DATABASE_URL="postgresql://invalid"  # Invalid to force fallback
DATABASE_URL_SQLITE="file:./dev.sqlite"
DB_FALLBACK_STRATEGY="auto"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
LOG_LEVEL="info"
```

For local development, the system will automatically fall back to SQLite.

### 4. Set Up and Seed the Database

Run the following commands to set up the database:

```bash
# Generate Prisma clients for both databases
npm run generate:prisma:all

# Apply SQLite migrations (for local development)
npm run migrate:sqlite

# Seed the database with initial data
npm run seed
```

The seed data includes default user accounts with different roles:

- **Admin**: admin@nexusprocure.com / password123
- **Manager**: manager@nexusprocure.com / password123
- **Approver**: approver@nexusprocure.com / password123
- **Procurement Officer**: procurement@nexusprocure.com / password123
- **Finance Officer**: finance@nexusprocure.com / password123

You can find the seed script in `prisma/seed.ts`.

### 5. Start Redis (Optional - for background jobs)

For full functionality including background job processing:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install Redis locally
# On Windows: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-windows/
# On macOS: brew install redis
# On Linux: sudo apt install redis-server
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 7. Access the Application

- **Dashboard**: Available at `/dashboard`
- **API Documentation**: Available at `/api` endpoints

## Testing and Building

### Running Tests

To run the test suite, use the following command:

```bash
npm test
```

### Building for Production

To create a production-ready build of the application, run:

```bash
npm run build
```

This command prepares the application for deployment with a PostgreSQL database.

## Advanced Features

### Background Job Processing

The application uses BullMQ with Redis for background job processing:

```bash
# Compute analytics (daily, weekly, monthly)
npm run compute-analytics daily
npm run compute-analytics weekly
npm run compute-analytics monthly

# Or trigger via API
curl -X POST http://localhost:3000/api/analytics/compute \
  -H "Content-Type: application/json" \
  -d '{"type": "daily", "date": "2024-01-01"}'
```

### Vendor Performance & Recommendations

```bash
# Get top vendors
curl http://localhost:3000/api/vendors/recommend?limit=5

# Update vendor performance metrics
curl -X POST http://localhost:3000/api/vendors/123/performance/update
```

### PDF Generation

PDFs are generated using Playwright for optimal performance:

```bash
# Generate IOM PDF
curl http://localhost:3000/api/pdf/iom/TOKEN

# Generate PO PDF
curl http://localhost:3000/api/pdf/po/TOKEN

# Generate PR PDF
curl http://localhost:3000/api/pdf/pr/TOKEN
```

## Deployment Options

### Docker Development (Recommended)

For a complete development environment with all services:

```bash
# Start all services (app, Redis, Postgres)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Docker Production

```bash
# Build and run production container
docker build -t nexusprocure .
docker run -p 3000:3000 -e DATABASE_URL="postgresql://..." nexusprocure
```

### Manual Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables for production
3. Run migrations: `npm run migrate:pg`
4. Build the application: `npm run build`
5. Start the server: `npm start`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://invalid` |
| `DATABASE_URL_SQLITE` | SQLite database file | `file:./dev.sqlite` |
| `DB_FALLBACK_STRATEGY` | Database fallback mode | `auto` |
| `NEXTAUTH_SECRET` | NextAuth secret key | Required |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `SENTRY_DSN` | Sentry error monitoring | Optional |
| `LOG_LEVEL` | Logging level | `info` |

## Database Management

### SQLite (Development)
```bash
npm run migrate:sqlite    # Apply migrations
npm run seed             # Seed database
```

### PostgreSQL (Production)
```bash
npm run migrate:pg       # Apply migrations
npm run generate:prisma:all  # Generate clients
```

## Monitoring & Analytics

### View Application Logs
```bash
# Structured logs with Pino
npm run dev  # Logs will show in console
```

### Error Monitoring
- Sentry integration configured
- Set `SENTRY_DSN` for error tracking

### Performance Monitoring
- Background job queue monitoring via Redis
- Database query optimization with Prisma
- PDF generation performance tracking

## Project Structure

The project follows a feature-centric structure within the Next.js App Router paradigm.

- **`src/app/`**: Contains all application routes.
  - **`api/`**: Houses all backend API endpoints.
  - **`dashboard/`, `iom/`, `po/`, `pr/`**: Contain the frontend pages for each feature.
- **`src/lib/`**: Core application business logic.
  - **`iom.ts`, `po.ts`, `pr.ts`**: Backend functions for each module.
  - **`auth.ts`, `auth-utils.ts`**: NextAuth.js configuration and authorization helpers.
  - **`schemas.ts`**: Zod validation schemas.
- **`src/components/`**: Shared, reusable React components.
- **`prisma/`**: Database schema, migrations, and seed scripts.
- **`docs/`**: Contains detailed documentation about the system.

## Additional Documentation

For more in-depth information, please refer to the documents in the `docs/` directory:

- `SYSTEM_OVERVIEW.md`: A detailed look at the application's architecture and features.
- `PROPOSAL.md`: The original project proposal and roadmap.
- `01_database.md`: Information about the database schema and models.
- `02_auth.md`: Details on the authentication and authorization implementation.
- `03_testing.md`: The project's testing strategy.
- `04_configuration.md`: Guidance on configuring the application.
- `05_dashboard_analytics.md`: Information on the dashboard and analytics features.
- `06_user_management.md`: Details on user and role management.