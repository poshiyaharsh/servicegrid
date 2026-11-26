-- Phase 10: Estimates, Invoices, GST/Global Billing, Payments, Notes, Expenses, Commissions, Audit & RLS

CREATE TABLE IF NOT EXISTS "estimates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "work_order_id" UUID,
    "estimate_number" VARCHAR(40) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "grand_total" DECIMAL(14,2) NOT NULL,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "estimates_tenant_id_idx" ON "estimates"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "estimates_tenant_id_estimate_number_key" ON "estimates"("tenant_id", "estimate_number");

CREATE TABLE IF NOT EXISTS "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "work_order_id" UUID,
    "estimate_id" UUID,
    "invoice_number" VARCHAR(40) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "fiscal_year" VARCHAR(16) NOT NULL,
    "business_gstin" VARCHAR(20),
    "customer_gstin" VARCHAR(20),
    "is_inter_state" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cgst_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "grand_total" DECIMAL(14,2) NOT NULL,
    "paid_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(14,2) NOT NULL,
    "finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");

CREATE TABLE IF NOT EXISTS "invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "hsn_sac" VARCHAR(24),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate_percent" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "invoice_items_tenant_id_idx" ON "invoice_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" VARCHAR(32) NOT NULL,
    "reference" VARCHAR(120),
    "status" VARCHAR(24) NOT NULL DEFAULT 'RECORDED',
    "refunded_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciled_at" TIMESTAMPTZ(6),
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "payments_tenant_id_idx" ON "payments"("tenant_id");
CREATE INDEX IF NOT EXISTS "payments_invoice_id_idx" ON "payments"("invoice_id");

CREATE TABLE IF NOT EXISTS "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "note_number" VARCHAR(40) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "credit_notes_tenant_id_idx" ON "credit_notes"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_tenant_id_note_number_key" ON "credit_notes"("tenant_id", "note_number");

CREATE TABLE IF NOT EXISTS "debit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "note_number" VARCHAR(40) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "debit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "debit_notes_tenant_id_idx" ON "debit_notes"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "debit_notes_tenant_id_note_number_key" ON "debit_notes"("tenant_id", "note_number");

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID,
    "technician_id" UUID,
    "category" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "incurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expenses_tenant_id_idx" ON "expenses"("tenant_id");

CREATE TABLE IF NOT EXISTS "technician_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_commissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "technician_commissions_tenant_id_idx" ON "technician_commissions"("tenant_id");

CREATE TABLE IF NOT EXISTS "financial_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(48) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "actor_user_id" UUID,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "financial_audit_logs_tenant_id_idx" ON "financial_audit_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "financial_audit_logs_tenant_id_entity_type_entity_id_idx" ON "financial_audit_logs"("tenant_id", "entity_type", "entity_id");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'estimates',
    'invoices',
    'invoice_items',
    'payments',
    'credit_notes',
    'debit_notes',
    'expenses',
    'technician_commissions',
    'financial_audit_logs'
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
