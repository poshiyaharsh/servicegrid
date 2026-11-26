-- Phase 12: Integrations, Message Templates, Notifications, Webhooks & RLS

CREATE TABLE IF NOT EXISTS "integration_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider_type" VARCHAR(32) NOT NULL,
    "provider_name" VARCHAR(64) NOT NULL,
    "mode" VARCHAR(16) NOT NULL DEFAULT 'SANDBOX',
    "config" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "health_status" VARCHAR(24) NOT NULL DEFAULT 'HEALTHY',
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_accounts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "integration_accounts_tenant_id_idx" ON "integration_accounts"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_accounts_tenant_id_provider_type_key" ON "integration_accounts"("tenant_id", "provider_type");

CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel" VARCHAR(24) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "body_template" TEXT NOT NULL,
    "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "message_templates_tenant_id_idx" ON "message_templates"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "message_templates_tenant_id_channel_code_key" ON "message_templates"("tenant_id", "channel", "code");

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel" VARCHAR(24) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "template_code" VARCHAR(64),
    "rendered_body" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" VARCHAR(120),
    "failure_reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_status_idx" ON "notifications"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(48) NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "webhook_events_tenant_id_idx" ON "webhook_events"("tenant_id");
CREATE INDEX IF NOT EXISTS "webhook_events_tenant_id_status_idx" ON "webhook_events"("tenant_id", "status");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'integration_accounts',
    'message_templates',
    'notifications',
    'webhook_events'
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
