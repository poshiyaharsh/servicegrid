-- Phase 06: Service Requests, Work Orders, Visits, Checklists, Attachments, Reports & RLS

CREATE TABLE IF NOT EXISTS "request_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "default_sla_hours" INTEGER NOT NULL DEFAULT 24,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "request_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "request_categories_tenant_id_idx" ON "request_categories"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "request_categories_tenant_id_code_key" ON "request_categories"("tenant_id", "code");

CREATE TABLE IF NOT EXISTS "service_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "customer_id" UUID NOT NULL,
    "asset_id" UUID,
    "category_id" UUID,
    "source" VARCHAR(24) NOT NULL DEFAULT 'MANUAL',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(24) NOT NULL DEFAULT 'NEW',
    "sla_due_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "service_requests_tenant_id_idx" ON "service_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "service_requests_tenant_id_status_idx" ON "service_requests"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "service_request_id" UUID,
    "customer_id" UUID NOT NULL,
    "asset_id" UUID,
    "job_number" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(24) NOT NULL DEFAULT 'NEW',
    "scheduled_start_at" TIMESTAMPTZ(6),
    "scheduled_end_at" TIMESTAMPTZ(6),
    "sla_due_at" TIMESTAMPTZ(6),
    "technician_notes" TEXT,
    "customer_approved_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_idx" ON "work_orders"("tenant_id");
CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_status_idx" ON "work_orders"("tenant_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_tenant_id_job_number_key" ON "work_orders"("tenant_id", "job_number");

CREATE TABLE IF NOT EXISTS "work_order_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "technician_user_id" UUID NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_order_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_order_assignments_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "work_order_assignments_tenant_id_idx" ON "work_order_assignments"("tenant_id");
CREATE INDEX IF NOT EXISTS "work_order_assignments_work_order_id_idx" ON "work_order_assignments"("work_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "work_order_assignments_tenant_id_work_order_id_technician_user_id_key" ON "work_order_assignments"("tenant_id", "work_order_id", "technician_user_id");

CREATE TABLE IF NOT EXISTS "work_order_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "visit_number" INTEGER NOT NULL,
    "scheduled_start_at" TIMESTAMPTZ(6),
    "scheduled_end_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    CONSTRAINT "work_order_visits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_order_visits_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "work_order_visits_tenant_id_idx" ON "work_order_visits"("tenant_id");
CREATE INDEX IF NOT EXISTS "work_order_visits_work_order_id_idx" ON "work_order_visits"("work_order_id");

CREATE TABLE IF NOT EXISTS "job_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "from_status" VARCHAR(24),
    "to_status" VARCHAR(24) NOT NULL,
    "changed_by_user_id" UUID,
    "reason" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_status_history_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "job_status_history_tenant_id_idx" ON "job_status_history"("tenant_id");
CREATE INDEX IF NOT EXISTS "job_status_history_work_order_id_idx" ON "job_status_history"("work_order_id");

CREATE TABLE IF NOT EXISTS "checklists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "items" JSONB NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "checklists_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "checklists_tenant_id_idx" ON "checklists"("tenant_id");
CREATE INDEX IF NOT EXISTS "checklists_work_order_id_idx" ON "checklists"("work_order_id");

CREATE TABLE IF NOT EXISTS "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(48) NOT NULL,
    "entity_id" UUID NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "uploaded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "attachments_tenant_id_idx" ON "attachments"("tenant_id");
CREATE INDEX IF NOT EXISTS "attachments_tenant_id_entity_type_entity_id_idx" ON "attachments"("tenant_id", "entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "job_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "work_performed" TEXT NOT NULL,
    "customer_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_name" VARCHAR(160),
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_reports_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "job_reports_tenant_id_idx" ON "job_reports"("tenant_id");
CREATE INDEX IF NOT EXISTS "job_reports_work_order_id_idx" ON "job_reports"("work_order_id");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'request_categories',
    'service_requests',
    'work_orders',
    'work_order_assignments',
    'work_order_visits',
    'job_status_history',
    'checklists',
    'attachments',
    'job_reports'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
      tbl
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO servicegrid_app', tbl);
  END LOOP;
END $$;
