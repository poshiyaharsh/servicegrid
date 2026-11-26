-- Phase 07: Idempotent Mobile Sync Operations & RLS

CREATE TABLE IF NOT EXISTS "sync_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "operation_id" VARCHAR(80) NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" VARCHAR(48) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(48) NOT NULL,
    "client_version" INTEGER NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "result_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sync_operations_tenant_id_idx" ON "sync_operations"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sync_operations_tenant_id_operation_id_key" ON "sync_operations"("tenant_id", "operation_id");

ALTER TABLE "sync_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_operations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "sync_operations";
CREATE POLICY tenant_isolation_policy ON "sync_operations"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sync_operations" TO servicegrid_app;
