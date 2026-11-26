-- Phase 09: Inventory, Warehouses, Vehicle Stock, Auditable Ledger, Suppliers, POs & RLS

CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "barcode" VARCHAR(80),
    "qr_code" VARCHAR(120),
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "reorder_threshold" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "products_tenant_id_idx" ON "products"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "warehouse_type" VARCHAR(24) NOT NULL DEFAULT 'MAIN',
    "assigned_technician_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_tenant_id_code_key" ON "warehouses"("tenant_id", "code");

CREATE TABLE IF NOT EXISTS "stock_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_balances_tenant_id_idx" ON "stock_balances"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_balances_tenant_id_warehouse_id_product_id_key" ON "stock_balances"("tenant_id", "warehouse_id", "product_id");

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_type" VARCHAR(32) NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reference_type" VARCHAR(48),
    "reference_id" UUID,
    "reason" VARCHAR(255),
    "actor_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_product_id_idx" ON "stock_movements"("tenant_id", "product_id");

CREATE TABLE IF NOT EXISTS "stock_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "from_warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'COMPLETED',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_transfers_tenant_id_idx" ON "stock_transfers"("tenant_id");

CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "gstin" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "po_number" VARCHAR(40) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'ORDERED',
    "items" JSONB NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "received_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_tenant_id_po_number_key" ON "purchase_orders"("tenant_id", "po_number");

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products',
    'warehouses',
    'stock_balances',
    'stock_movements',
    'stock_transfers',
    'suppliers',
    'purchase_orders'
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
