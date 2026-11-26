-- Phase 11: AMC Contracts, Preventive Maintenance & Idempotent Scheduled Visits with RLS

CREATE TABLE IF NOT EXISTS "amc_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "contract_number" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "visit_frequency" VARCHAR(24) NOT NULL,
    "coverage_details" JSONB NOT NULL,
    "covered_asset_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    "cancellation_reason" TEXT,
    "renewed_from_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "amc_contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "amc_contracts_tenant_id_idx" ON "amc_contracts"("tenant_id");
CREATE INDEX IF NOT EXISTS "amc_contracts_tenant_id_status_end_date_idx" ON "amc_contracts"("tenant_id", "status", "end_date");
CREATE UNIQUE INDEX IF NOT EXISTS "amc_contracts_tenant_id_contract_number_key" ON "amc_contracts"("tenant_id", "contract_number");

CREATE TABLE IF NOT EXISTS "scheduled_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "visit_key" VARCHAR(48) NOT NULL,
    "scheduled_date" TIMESTAMPTZ(6) NOT NULL,
    "work_order_id" UUID,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_visits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scheduled_visits_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "amc_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "scheduled_visits_tenant_id_idx" ON "scheduled_visits"("tenant_id");
CREATE INDEX IF NOT EXISTS "scheduled_visits_contract_id_idx" ON "scheduled_visits"("contract_id");
CREATE UNIQUE INDEX IF NOT EXISTS "scheduled_visits_tenant_id_contract_id_visit_key_key" ON "scheduled_visits"("tenant_id", "contract_id", "visit_key");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['amc_contracts', 'scheduled_visits']
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
