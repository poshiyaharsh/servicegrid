# Architecture Overview — FieldSutra (ServiceGrid)

- **Pattern:** Modular Monolith (`apps/api`, NestJS) + Asynchronous BullMQ Workers (`services/*-worker`).
- **Frontend:** Next.js (`apps/web`) + React Native Android-first (`apps/mobile`) sharing `@servicegrid/ui`, `@servicegrid/types`, `@servicegrid/validation`, `@servicegrid/permissions`, `@servicegrid/api-client`, and `@servicegrid/offline-sync`.
- **Database:** PostgreSQL 16 with Prisma ORM (`packages/database`), UUID primary keys, `tenant_id` scoping, and Row-Level Security (RLS) enforced in Phase 04.
- **Cache & Queues:** Redis 7 + BullMQ.
- **Object Storage:** S3-compatible (MinIO locally).
- **Observability:** Structured JSON logs, OpenAPI (`/api/docs`), OpenTelemetry collector (`infrastructure/monitoring/`), and Sentry-compatible error monitor hook.
