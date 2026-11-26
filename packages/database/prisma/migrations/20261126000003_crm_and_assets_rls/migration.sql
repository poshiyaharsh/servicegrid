-- Phase 05: CRM, Leads, Assets, Service History, and PostgreSQL RLS

CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_type" VARCHAR(24) NOT NULL DEFAULT 'INDIVIDUAL',
    "display_name" VARCHAR(160) NOT NULL,
    "company_name" VARCHAR(160),
    "gstin" VARCHAR(20),
    "primary_phone" VARCHAR(32) NOT NULL,
    "primary_email" VARCHAR(255),
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "customers_tenant_id_idx" ON "customers"("tenant_id");
CREATE INDEX IF NOT EXISTS "customers_tenant_id_primary_phone_idx" ON "customers"("tenant_id", "primary_phone");

CREATE TABLE IF NOT EXISTS "customer_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "role" VARCHAR(80),
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "customer_contacts_tenant_id_idx" ON "customer_contacts"("tenant_id");
CREATE INDEX IF NOT EXISTS "customer_contacts_customer_id_idx" ON "customer_contacts"("customer_id");

CREATE TABLE IF NOT EXISTS "addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" VARCHAR(64) NOT NULL DEFAULT 'Primary',
    "line1" VARCHAR(255) NOT NULL,
    "line2" VARCHAR(255),
    "city" VARCHAR(80) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "country" VARCHAR(8) NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "addresses_tenant_id_idx" ON "addresses"("tenant_id");
CREATE INDEX IF NOT EXISTS "addresses_customer_id_idx" ON "addresses"("customer_id");

CREATE TABLE IF NOT EXISTS "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "source" VARCHAR(48) NOT NULL DEFAULT 'MANUAL',
    "status" VARCHAR(32) NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assigned_to_user_id" UUID,
    "converted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX IF NOT EXISTS "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "direction" VARCHAR(16) NOT NULL,
    "summary" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "conversations_tenant_id_idx" ON "conversations"("tenant_id");
CREATE INDEX IF NOT EXISTS "conversations_customer_id_idx" ON "conversations"("customer_id");

CREATE TABLE IF NOT EXISTS "customer_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "activity_type" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "actor_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "customer_activities_tenant_id_idx" ON "customer_activities"("tenant_id");
CREATE INDEX IF NOT EXISTS "customer_activities_customer_id_idx" ON "customer_activities"("customer_id");

CREATE TABLE IF NOT EXISTS "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "manufacturer" VARCHAR(120),
    "model_name" VARCHAR(120),
    "serial_number" VARCHAR(120),
    "installed_at" TIMESTAMPTZ(6),
    "warranty_expires_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assets_tenant_id_idx" ON "assets"("tenant_id");
CREATE INDEX IF NOT EXISTS "assets_customer_id_idx" ON "assets"("customer_id");

CREATE TABLE IF NOT EXISTS "service_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "asset_id" UUID,
    "summary" VARCHAR(255) NOT NULL,
    "serviced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technician_name" VARCHAR(160),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "service_history_tenant_id_idx" ON "service_history"("tenant_id");
CREATE INDEX IF NOT EXISTS "service_history_customer_id_idx" ON "service_history"("customer_id");

-- Enable + Force RLS and grant access to servicegrid_app
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'customers',
    'customer_contacts',
    'addresses',
    'leads',
    'conversations',
    'customer_activities',
    'assets',
    'service_history'
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
