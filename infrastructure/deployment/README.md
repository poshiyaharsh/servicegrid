# Deployment Infrastructure

- `infrastructure/docker/` — Dockerfiles and PostgreSQL initialization scripts.
- `infrastructure/nginx/` — Reverse proxy configuration routing `/api/` to NestJS and `/` to Next.js.
- `infrastructure/monitoring/` — OpenTelemetry collector configuration.
- Production TLS, backup scripts, and VPS deployment playbooks will be finalized in Phase 16.
