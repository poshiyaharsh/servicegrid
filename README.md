# FieldSutra (ServiceGrid)

FieldSutra is a commercial, multi-tenant Field Service Operations Management SaaS built India-first and global-ready.

## Monorepo Structure

```text
servicegrid/
  apps/
    web/                 # Next.js web application & customer portal
    mobile/              # React Native Android-first offline technician app
    api/                 # NestJS modular monolith REST API (/api/v1)
  packages/
    database/            # Prisma schema, migrations, and PostgreSQL client
    ui/                  # Design tokens, shared React UI components, email/invoice templates
    types/               # Shared TypeScript domain & API types
    validation/          # Shared Zod validation schemas
    permissions/         # Role-based access control (RBAC) matrix
    api-client/          # Typed REST API client with idempotency support
    offline-sync/        # SQLite outbox & conflict/retry primitives
    config/              # Typed environment configuration loader
  services/
    notification-worker/ # BullMQ notification worker
    invoice-worker/      # BullMQ invoice & PDF worker
    scheduler-worker/    # BullMQ AMC & recurring job worker
    integration-worker/  # BullMQ webhook & integration worker
  infrastructure/
    docker/              # Dockerfiles & Postgres init scripts
    nginx/               # Reverse proxy config
    monitoring/          # OpenTelemetry collector config
    deployment/          # Deployment notes
  branding/              # SVG logo suite & brand guidelines
  docs/                  # Architecture & brand documentation
  tests/                 # Cross-package & E2E test suites
  scripts/               # Developer utility scripts
```

## Quick Start

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```
2. **Start infrastructure services (PostgreSQL, Redis, MinIO):**
   ```bash
   docker compose up -d
   ```
3. **Install workspace dependencies & generate Prisma client:**
   ```bash
   pnpm install
   pnpm db:generate
   ```
4. **Verify workspace:**
   ```bash
   pnpm typecheck
   pnpm build
   pnpm test
   ```

## Commit Standards
See [CONTRIBUTING.md](CONTRIBUTING.md) for Conventional Commits and security hygiene rules.
