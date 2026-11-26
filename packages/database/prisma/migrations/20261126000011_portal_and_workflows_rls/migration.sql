-- Phase 14: Workflow Definitions, Loop-Safe Runs, Customer Feedback & RLS

CREATE TABLE IF NOT EXISTS "workflow_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "trigger_event" VARCHAR(64) NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "delay_seconds" INTEGER NOT NULL DEFAULT 0,
    "max_depth" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "workflow_definitions_tenant_id_idx" ON "workflow_definitions"("tenant_id");
CREATE INDEX IF NOT EXISTS "workflow_definitions_tenant_id_trigger_event_idx" ON "workflow_definitions"("tenant_id", "trigger_event");

CREATE TABLE IF NOT EXISTS "workflow_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "trigger_event" VARCHAR(64) NOT NULL,
    "correlation_id" VARCHAR(80) NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(24) NOT NULL,
    "executed_actions" JSONB NOT NULL,
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "workflow_runs_tenant_id_idx" ON "workflow_runs"("tenant_id");
CREATE INDEX IF NOT EXISTS "workflow_runs_tenant_id_correlation_id_idx" ON "workflow_runs"("tenant_id", "correlation_id");

CREATE TABLE IF NOT EXISTS "customer_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customer_feedback_tenant_id_idx" ON "customer_feedback"("tenant_id");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['workflow_definitions', 'workflow_runs', 'customer_feedback']
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
