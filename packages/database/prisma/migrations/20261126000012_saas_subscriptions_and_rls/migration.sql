-- Phase 16: Commercial SaaS Plans, Subscriptions, Events, Usage Limits & RLS

CREATE TABLE IF NOT EXISTS "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "monthly_price" DECIMAL(12,2) NOT NULL,
    "annual_price" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "max_technicians" INTEGER NOT NULL,
    "max_jobs_per_month" INTEGER NOT NULL,
    "max_branches" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "plans_code_key" ON "plans"("code");

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "billing_cycle" VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
    "status" VARCHAR(24) NOT NULL DEFAULT 'TRIALING',
    "trial_ends_at" TIMESTAMPTZ(6),
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "grace_period_ends_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

CREATE TABLE IF NOT EXISTS "subscription_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(12,2),
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "subscription_events_tenant_id_idx" ON "subscription_events"("tenant_id");
CREATE INDEX IF NOT EXISTS "subscription_events_subscription_id_idx" ON "subscription_events"("subscription_id");

CREATE TABLE IF NOT EXISTS "usage_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "metric_key" VARCHAR(48) NOT NULL,
    "period_key" VARCHAR(24) NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "limit_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "usage_records_tenant_id_idx" ON "usage_records"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_tenant_id_metric_key_period_key_key" ON "usage_records"("tenant_id", "metric_key", "period_key");

GRANT SELECT ON TABLE "plans" TO servicegrid_app;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['subscriptions', 'subscription_events', 'usage_records']
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
