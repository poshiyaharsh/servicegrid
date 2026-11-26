-- Phase 08: Technicians, Skills, Leave/Availability, Appointments & RLS

CREATE TABLE IF NOT EXISTS "technicians" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID,
    "display_name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "home_lat" DECIMAL(10,7),
    "home_lng" DECIMAL(10,7),
    "working_hours" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "technicians_tenant_id_idx" ON "technicians"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "technicians_tenant_id_user_id_key" ON "technicians"("tenant_id", "user_id");

CREATE TABLE IF NOT EXISTS "technician_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "skill_code" VARCHAR(64) NOT NULL,
    "proficiency_level" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "technician_skills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "technician_skills_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "technician_skills_tenant_id_idx" ON "technician_skills"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "technician_skills_tenant_id_technician_id_skill_code_key" ON "technician_skills"("tenant_id", "technician_id", "skill_code");

CREATE TABLE IF NOT EXISTS "technician_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" VARCHAR(255),
    "status" VARCHAR(24) NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_availability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "technician_availability_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "technician_availability_tenant_id_idx" ON "technician_availability"("tenant_id");
CREATE INDEX IF NOT EXISTS "technician_availability_technician_id_idx" ON "technician_availability"("technician_id");

CREATE TABLE IF NOT EXISTS "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "estimated_travel_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_idx" ON "appointments"("tenant_id");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_technician_id_start_at_idx" ON "appointments"("tenant_id", "technician_id", "start_at");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'technicians',
    'technician_skills',
    'technician_availability',
    'appointments'
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
