#!/usr/bin/env bash
set -euo pipefail

# Encrypted PostgreSQL backup script with 30-day local retention
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fieldsutra}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/fieldsutra_${TIMESTAMP}.dump.enc"

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY must be set}"
mkdir -p "${BACKUP_DIR}"

docker compose -f infrastructure/docker/docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-servicegrid}" -d "${POSTGRES_DB:-servicegrid}" -F c \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -out "${OUT_FILE}"

find "${BACKUP_DIR}" -type f -name "fieldsutra_*.dump.enc" -mtime "+${RETENTION_DAYS}" -delete
echo "Encrypted backup written to ${OUT_FILE}"
