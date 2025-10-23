Full, actionable — AI-ready — Improvement Plan for NexusProcure

(Complete — includes SQLite fallback for uninterrupted AI development, plus everything needed to push the product to world-class enterprise-grade.)

Nice and clear: this plan is written so an AI agent can execute steps immediately. Every major area includes what to do, how to do it (commands/code snippets), verification criteria, and dependencies. I keep the SQLite fallback strategy prominent so the AI can develop locally even when Postgres is unavailable.

I. Strategy summary (one-line)

Make NexusProcure enterprise-ready by hardening security, improving scalability and reliability, adding robust workflows & analytics, integrating AI/ML procurement intelligence, supporting deployable infra & CI/CD, and enabling a smooth Postgres ←→ SQLite fallback that allows uninterrupted AI-driven development.

II. Database strategy: Postgres primary, SQLite fallback (developer-first rule)
Goal

Primary: use Postgres for staging/production.
Fallback: allow AI agents and local dev to use SQLite transparently when Postgres is not reachable.

Design choices (rationale)

Prisma cannot switch providers from a single schema.prisma at runtime. Workaround: maintain two schema files and two generated clients, and instantiate the correct Prisma client at runtime based on environment and connectivity checks.

Keep migrations synchronized: run Postgres migrations first; if Postgres not available, use SQLite migrations/seeds so AI can proceed locally.

Implementation (AI-executable)

Add two Prisma schema files

prisma/schema.postgres.prisma (provider = "postgresql")

prisma/schema.sqlite.prisma (provider = "sqlite")

Both must contain the same models. Example provider stubs:

// prisma/schema.postgres.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/postgres-client"
}
model User { /* ... */ }

// prisma/schema.sqlite.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL_SQLITE")
}
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/sqlite-client"
}
model User { /* same models */ }


Generate both Prisma clients (CI & local):

# generate sqlite client
PRISMA_SCHEMA=prisma/schema.sqlite.prisma npx prisma generate --schema=prisma/schema.sqlite.prisma
# generate postgres client
PRISMA_SCHEMA=prisma/schema.postgres.prisma npx prisma generate --schema=prisma/schema.postgres.prisma


Create a runtime selector wrapper src/lib/db/index.ts:

import { PrismaClient as PostgresClient } from '../../node_modules/.prisma/postgres-client/index';
import { PrismaClient as SqliteClient } from '../../node_modules/.prisma/sqlite-client/index';

const pg = new PostgresClient();
const sq = new SqliteClient();

async function getPrimaryClient() {
  // try Postgres ping
  try {
    await pg.$connect();
    // quick health check - select 1
    await pg.$queryRaw`SELECT 1`;
    await sq.$disconnect().catch(()=>{});
    return pg;
  } catch (e) {
    // fallback to sqlite
    try {
      await sq.$connect();
      return sq;
    } catch (err) {
      throw new Error('No database available');
    }
  }
}

export default getPrimaryClient;


Use getPrimaryClient() in all src/lib/* modules. It returns a connected Prisma client (Postgres preferred).

Migrations & Seeds

Keep two migration directories:

prisma/migrations-postgres/* (managed by prisma migrate)

prisma/migrations-sqlite/* (managed by prisma migrate pointing to sqlite schema)

Scripts in package.json:

"scripts": {
  "migrate:pg": "npx prisma migrate deploy --schema=prisma/schema.postgres.prisma",
  "migrate:sqlite": "npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma",
  "generate:prisma:all": "PRISMA_SCHEMA=prisma/schema.postgres.prisma npx prisma generate --schema=prisma/schema.postgres.prisma && PRISMA_SCHEMA=prisma/schema.sqlite.prisma npx prisma generate --schema=prisma/schema.sqlite.prisma"
}


Environment variables

Production/staging: DATABASE_URL=postgresql://... (Postgres)

For fallback SQLite: DATABASE_URL_SQLITE=file:./dev.sqlite

Add DB_FALLBACK_STRATEGY=auto (or force_sqlite for test runs)

Verification

Start app when Postgres running → app uses Postgres (check logs for Connected to Postgres or run SELECT current_database() via admin route).

Stop Postgres → app falls back to SQLite automatically and continues serving dev API endpoints.

Run npm run migrate:pg when Postgres available; run npm run migrate:sqlite for local dev.

CI note

CI should use Postgres; but AI agents running in ephemeral environments without Postgres can be allowed to run with DB_FALLBACK_STRATEGY=auto.

III. Immediate Production-Grade Improvements (full list)

Below are all improvements grouped logically. Each item includes short commands or code where relevant and verification steps.

A. Security & Compliance

Secrets management

Move secrets to a secret manager (e.g., Vercel Secrets, AWS Secrets Manager, Doppler).

Remove secrets from repo. Add git-secrets pre-commit to block API keys.

Auth hardening

Short-lived JWT (15 min), refresh tokens hashed in DB.

Rotate NEXTAUTH_SECRET periodically.

Enforce MFA for admin roles (TOTP).

Input validation & sanitization

Use Zod schemas for all API endpoints.

Add server-side sanitization for HTML inputs and file names.

Secure HTTP

Enforce HTTPS + HSTS, Content-Security-Policy, X-Frame-Options.

Use next-safe middleware or helmet.

RBAC audits

Add immutable AuditLog entries for all permission/role changes.

Add an admin endpoint GET /api/audit?entity=....

PCI/PII & Data retention

Redact PII in logs.

Implement retention policy (configurable) and data deletion endpoints for compliance (GDPR).

Verification

Penetration scan (automated) returns no critical vulnerabilities.

Sentry errors do not contain secrets or PII.

MFA required for admin sign-in.

B. Reliability & Scalability

DB: Postgres in production (see above). Use read replicas for reporting.

Connection pooling: add pgBouncer or use Prisma pooling via pgbouncer.

Stateless API servers: store session tokens with JWT; avoid in-memory sessions.

Persistent job workers: use BullMQ with Redis for background tasks (PDF generation, notifications, analytics).

Horizontal scaling: containerize with Docker; orchestrate with Kubernetes or managed services (ECS/EKS).

Caching

Redis for query caching, rate limiting, and job queue.

Use short TTLs for dashboard queries.

Verification

Load test 1k concurrent users — system remains functional.

No memory leaks across 24h of synthetic load.

C. Observability, Monitoring & Alerting

Logging

Structured logs with pino or winston.

Centralized log store (LogDNA / Datadog / ELK).

Tracing & performance

Integrate OpenTelemetry for request traces.

Collect histograms for API latencies.

Error monitoring

Sentry + performance monitoring.

Dashboards

Grafana: API latency, DB connections, queue length, PDF worker status.

Alerting: error rate > x, queue backlog > y, disk usage > z.

Verification

Alerts triggered in test scenarios (raise a synthetic error, watch alert).

D. PDF & Document Generation (optimized)

Persistent headless browser (Playwright) as a microservice or sidecar (see earlier pdfService.ts).

Document templating: separate templates (HTML + CSS) for print, use render queue for bulk PDFs.

Binary storage: store generated PDFs in object storage (S3 / MinIO) and serve signed URLs.

Verification

Generate 100 PDFs concurrently via queue; no crashes, predictable latency.

E. Workflow Engine & Approvals (make configurable & auditable)

WorkflowDefinition model (as earlier).

Workflow engine with step types:

approval (single/parallel)

auto-approve (conditions)

manual (human)

AuditTrail with before/after snapshots and signer metadata.

Condition DSL for conditions like amount > 100000 or vendor.blacklisted == false.

Verification

Admin can author workflow.

Test complex scenario: parallel approvals, conditional steps, escalation on timeout.

F. Procurement Intelligence & AI Features

Vendor scoring

Build features: onTimeRate, defectRate, priceVariance, responseTime.

Weighted score; store and surface with PO suggestions.

Anomaly detection

Implement rule-based first (price spikes, duplicates), then collect features for ML model (isolation forest or simple XGBoost).

Recommendation engine

Suggest vendors for each line item based on price history & score.

Smart approvals

Auto-approve low-risk purchases; escalate high-risk ones.

NLP assistant

Allow natural-language PO creation: “Create PO for 10 x HP Laptops at best price.”

Use an LLM only to generate suggestions; require user review & explicit submit (safety).

Verification

Recommendation accuracy tested against historical data (precision/recall).

Anomaly detection flags historical anomalies correctly.

G. Integrations & Connectors

ERP & Accounting: QuickBooks, SAP, Oracle (via connectors / webhooks).

Supplier punchout: support supplier catalogs (cXML / OCI).

Payment gateways: bank API / accounting posting, payment confirmations via webhook.

SAML / OIDC: enterprise SSO providers (Okta, Azure AD).

Verification

Successful test posts to QuickBooks sandbox or mocked ERP endpoint.

H. UX Improvements & Accessibility

Design system & components

Use Tailwind and a shared component library.

Storybook for components.

Mobile-responsive & PWA

Approver UX optimized for mobile, push notifications and deep links.

Accessibility

Ensure WCAG 2.1 AA compliance (keyboard nav, ARIA roles).

Onboarding & help

Step-by-step flows, inline help, and walkthroughs. Add audit/approval explanations.

Verification

Lighthouse accessibility score > 90.

Positive user test with sample users.

I. Testing Strategy

Unit tests for business logic (Vitest/Jest).

Integration tests for API routes (playwright / supertest).

E2E tests for critical flows (IOM→PO→PR).

Contract tests for external connectors.

Security tests: automated SAST, DAST via tools (e.g., Snyk/OWASP ZAP).

Performance tests: k6 / Artillery scripts.

Verification

CI enforces tests and coverage gates (≥80% for business logic).

No regressions on PR merges.

J. CI/CD, Infrastructure as Code & Deployments

CI pipeline

Lint → Typecheck → Test → Build → Prisma migrate (staging) → Deploy (staging).

Use GitHub Actions / GitLab CI / CircleCI.

CD

Canary deploy + automatic rollback on error thresholds.

Blue/Green for infra critical changes.

IaC

Terraform for cloud infra (DBs, Redis, buckets, K8s).

Helm charts for k8s deployments.

Secrets

Use native provider secrets (e.g., AWS Secrets Manager) and not checked-in env files.

Verification

Pipeline runs on PR; staging deploy completes and smoke tests run.

K. Backup, DR & Data Retention

Backups

Postgres automated backups (daily + WAL archiving).

S3 object storage lifecycle & cross-region replication for PDFs.

Disaster recovery

RTO < 30 min, RPO < 1h (setable).

DR runbook and automated failover tests.

Retention

Configurable data retention with safe delete & legal hold.

Verification

Restore test from backup passes and app is functional.

L. Multi-tenancy & Enterprise Features

Optional multi-tenant

Database per-tenant or row-level tenancy (tenantId + db sharding).

Feature flags

LaunchDarkly / Unleash to toggle experimental features.

Role hierarchy & SSO policies

Granular org-level permissions, department policies.

Verification

Create two tenants and isolate data access.

M. Developer experience & AI-run ergonomics

Local dev quickstart

Docker compose file with:

app, Postgres (optional), Redis, MinIO, playwright service

./dev start that accepts --force-sqlite to start with sqlite only.

Seed data & sample scripts

npm run seed:dev loads sample tenants, vendors, PO history.

AI agent mode

AI_AGENT=true env toggles:

automatic fallback to sqlite if Postgres unreachable

non-destructive mode (no sending emails/push, use sandboxed external integrations)

Create src/lib/ai_agent_mode.ts to enforce safe stubs for external calls.

Docs

Auto-generated OpenAPI docs.

Developer README with script commands and AI-run safety notes.

Verification

AI agent can run all dev tasks with AI_AGENT=true and produce deterministic results.

dev start --force-sqlite boots app using SQLite.

IV. World-class Additions (differentiators)

These features push product to market-leading:

Supplier Marketplace & RFQ engine

Multi-vendor bidding, sealed bids, automated evaluation (price + quality + SLA).

Dynamic Contracting & Price Books

Import contract price tables; auto-apply contract pricing to POs.

Predictive Spend Optimization

Forecast spend and propose consolidation opportunities and strategic sourcing.

Continuous Compliance & Risk Scoring

Vendor risk score (financial, legal, ESG) updated via connectors.

Procurement Assistant (LLM + Retrieval)

Secure RAG system for procurement policy search, vendor history Q&A, and guided PO drafting.

AP/AR Reconciliation automation

Two-way sync with bank/ERP data; auto-match invoices, flag exceptions.

Marketplace & Extensibility

Public plugin architecture & partner SDKs so third-parties add connectors.

White-label & Localization

Themeable UI, multi-language, time zone, currency support.

Verification

Each feature has a POC and metrics for success (e.g., Sourcing savings %, automated matches rate).

V. Execution plan (agent-friendly tasks with verification)

Below is a condensed task graph the AI agent can execute in order (each task executable immediately; dependencies noted).

Bootstrap: Generate both Prisma clients

Run npm run generate:prisma:all

Verify both clients exist in node_modules/.prisma/*

Implement runtime DB selector (src/lib/db/index.ts)

Wire all existing src/lib/* to use selector.

Verification: app starts with Postgres up and uses Postgres; stop Postgres, app falls back to sqlite.

Migrate & Seed scripts

Create migrate:pg and migrate:sqlite. Run accordingly.

Verify via prisma studio or GET /api/health.

PDF service replacement (src/lib/pdfService.ts)

Add Playwright singleton, change routes to use it.

Verify PDF outputs match.

Add job queue & move heavy ops to queue

Install bullmq + Redis; move PDF/analytics jobs.

Verify queue processing works.

Add rate limiting + secure headers

Install @upstash/ratelimit and helmet.

Verify 429 returned on exceeding limits.

Auth improvements (JWT short expiry + refresh tokens)

Update NextAuth config + add refresh endpoint + DB table.

Verification: expired token cannot access, refresh works.

Observability

Add pino logs, Sentry + OpenTelemetry setup.

Verification: logs and traces appear in configured systems.

Testing & CI

Add/expand tests for authorize, finance math, IOM→PO→PR flows.

Add GitHub Action to run tests and produce coverage.

Analytics pipeline

Implement nightly job to produce aggregated metrics into analytics table.

Verification: /api/analytics/overview returns precomputed metrics.

Workflow engine

Add WorkflowDefinition model and engine.

Verification: admin defines workflow; approval flow executes.

Vendor scoring & recommendations

Implement scoring, expose API.

Verification: suggestion list is returned and matches historical best vendor.

Integrations (SSO, ERP stubs)

Implement SAML/OIDC and wire connectors as pluggable modules.

Verification: SSO login works against a dev OIDC provider (e.g., Keycloak).

Production readiness

IaC (Terraform), containerization, Helm charts.

Run smoke tests on staging.

World-class modules

Implement RFQ engine, RAG-powered procurement assistant, marketplace.

VI. Example Commands & Helpful Snippets

Generate Prisma clients:

npm run generate:prisma:all


Start dev with SQLite fallback:

AI_AGENT=true DB_FALLBACK_STRATEGY=auto npm run dev
# or force sqlite
npm run dev -- --force-sqlite


Generate PDFs via queue (example entrystep):

curl -X POST http://localhost:3000/api/queue/pdf -d '{"url":"http://localhost:3000/print/iom/abc"}'


Run Postgres migrations:

npm run migrate:pg


Run sqlite migrations:

npm run migrate:sqlite


Run unit tests & coverage:

npm run test:unit

VII. Acceptance / Success criteria (measurable)

Robust dev flow

AI agent can run all dev + test tasks without Postgres using SQLite fallback (AI_AGENT=true).

Security

No secrets in repo; automated secrets scan passes.

MFA for admins enabled.

Reliability & Performance

System sustains synthetic load of 1k concurrent users in staging.

PDF pipeline scales and average latency < 1s per PDF for typical docs.

Observability

Errors traced; metrics dashboards in Grafana.

Business

Vendor recommendation increases procurement efficiency by measurable amount in A/B test (PO cost savings).