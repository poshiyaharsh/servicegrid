/**
 * SQLite DDL & migrations for FieldSutra Android-first offline technician storage.
 * Enforces tenant_id scoping, indexed queries, outbox sequence ordering, and attachment deduplication.
 */
export const SQLITE_MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS local_customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    address_summary TEXT,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_local_customers_tenant ON local_customers (tenant_id);`,

  `CREATE TABLE IF NOT EXISTS local_assets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_local_assets_tenant_customer ON local_assets (tenant_id, customer_id);`,

  `CREATE TABLE IF NOT EXISTS local_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    asset_id TEXT,
    job_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    scheduled_start_at TEXT,
    version INTEGER NOT NULL,
    technician_notes TEXT,
    diagnosis TEXT,
    repair_performed TEXT,
    completion_notes TEXT,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_local_jobs_tenant_status ON local_jobs (tenant_id, status);`,

  `CREATE TABLE IF NOT EXISTS local_checklists (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    work_order_id TEXT NOT NULL,
    title TEXT NOT NULL,
    items_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_local_checklists_wo ON local_checklists (tenant_id, work_order_id);`,

  `CREATE TABLE IF NOT EXISTS local_job_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    work_order_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    changed_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_local_job_history_wo ON local_job_history (tenant_id, work_order_id);`,

  `CREATE TABLE IF NOT EXISTS sync_outbox (
    operation_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    client_version INTEGER NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    last_error TEXT,
    server_version INTEGER,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sync_outbox_tenant_seq ON sync_outbox (tenant_id, status, sequence_number);`,

  `CREATE TABLE IF NOT EXISTS local_attachment_queue (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    work_order_id TEXT NOT NULL,
    category TEXT NOT NULL,
    file_name TEXT NOT NULL,
    local_uri TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    compressed INTEGER NOT NULL DEFAULT 1,
    progress_pct INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_local_attachment_dedup ON local_attachment_queue (tenant_id, work_order_id, checksum);`,

  `CREATE TABLE IF NOT EXISTS local_sync_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    synced_count INTEGER NOT NULL,
    conflict_count INTEGER NOT NULL,
    failed_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];
