# Production Deployment & Launch Runbook — FieldSutra

## 1. Production Stack
- **Compose:** `infrastructure/docker/docker-compose.prod.yml` (PostgreSQL 16, Redis 7 AOF + `maxmemory 512mb`, NestJS API, Next.js Web, Nginx TLS Reverse Proxy, OpenTelemetry Collector).
- **Workers:** Run `services/*-worker` alongside `api` against `REDIS_URL`.

## 2. TLS Certificates (Let's Encrypt / Certbot)
```bash
sudo certbot certonly --standalone -d app.fieldsutra.com -d api.fieldsutra.com
```
Certificates mount into Nginx via `/etc/letsencrypt:/etc/letsencrypt:ro` in `nginx.prod.conf` (TLS 1.2/1.3 + HSTS).

## 3. Database Migration Procedure
```bash
set -a && source .env && set +a
pnpm db:migrate:deploy
```

## 4. Encrypted Backups & Log Retention
- **Daily Encrypted Backup:** Schedule `scripts/backup-postgres.sh` via cron (`0 2 * * *`) with `BACKUP_ENCRYPTION_KEY` stored in your secret manager (retains 30 days by default).
- **Restore Procedure:** Run `scripts/restore-postgres.sh <file.dump.enc>` and verify row counts before reopening traffic.
- **Log Retention:** Configure Docker `json-file` log driver (`max-size: 50m`, `max-file: 10`) and ship structured JSON logs + Sentry alerts + OTel traces to your observability backend.

## 5. Pilot Customer Readiness Checklist
1. Seed SaaS plans (`STARTER`, `GROWTH`, `ENTERPRISE`) via `POST /api/v1/admin/plans`.
2. Onboard 3–5 pilot businesses using `/onboarding` (14-day trial active).
3. Verify WhatsApp Business Cloud API, Razorpay/UPI live keys, and S3 bucket credentials before switching `mode` from `SANDBOX` to `LIVE`.
4. Confirm `pnpm audit --prod` high/critical advisories are resolved prior to General Availability.
