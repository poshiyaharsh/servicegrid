#!/usr/bin/env bash
set -euo pipefail

# Restore encrypted PostgreSQL backup
ENC_FILE="${1:?Usage: restore-postgres.sh <path-to-dump.enc>}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY must be set}"

openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "${ENC_FILE}" \
  | docker compose -f infrastructure/docker/docker-compose.prod.yml exec -T postgres \
    pg_restore -U "${POSTGRES_USER:-servicegrid}" -d "${POSTGRES_DB:-servicegrid}" --clean --if-exists

echo "Restore completed from ${ENC_FILE}"
