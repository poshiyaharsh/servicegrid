export type MovementType =
  | 'PURCHASE_RECEIPT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'JOB_CONSUMPTION'
  | 'RETURN';

export interface ProductRecord {
  id: string;
  tenantId: string;
  sku: string;
  barcode: string | null;
  qrCode: string | null;
  name: string;
  category: string;
  unitPrice: string;
  reorderThreshold: number;
  isActive: boolean;
}

export interface WarehouseRecord {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  code: string;
  warehouseType: 'MAIN' | 'VEHICLE';
  assignedTechnicianId: string | null;
}

export interface StockBalanceRecord {
  warehouseId: string;
  productId: string;
  quantity: number;
}

export interface StockMovementRecord {
  id: string;
  tenantId: string;
  warehouseId: string;
  productId: string;
  movementType: MovementType;
  quantityDelta: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  actorUserId: string | null;
  createdAt: Date;
}

export interface SupplierRecord {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string | null;
  gstin: string | null;
}

export interface PurchaseOrderItem {
  productId: string;
  quantity: number;
  unitCost: string;
}

export interface PurchaseOrderRecord {
  id: string;
  tenantId: string;
  supplierId: string;
  warehouseId: string;
  poNumber: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalAmount: string;
  receivedAt: Date | null;
}

export const INVENTORY_STORE = Symbol('INVENTORY_STORE');

export interface InventoryStore {
  listProducts(tenantId: string): Promise<ProductRecord[]>;
  createProduct(input: Omit<ProductRecord, 'id' | 'isActive'>): Promise<ProductRecord>;

  listWarehouses(tenantId: string): Promise<WarehouseRecord[]>;
  createWarehouse(input: Omit<WarehouseRecord, 'id'>): Promise<WarehouseRecord>;

  getStockBalance(tenantId: string, warehouseId: string, productId: string): Promise<number>;
  listBalances(tenantId: string, warehouseId?: string): Promise<StockBalanceRecord[]>;
  listMovements(tenantId: string, productId?: string): Promise<StockMovementRecord[]>;

  /**
   * Atomically records a StockMovement and updates StockBalance.
   * Never updates stock quantities without a corresponding ledger movement.
   */
  recordMovement(input: {
    tenantId: string;
    warehouseId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    referenceType?: string | null;
    referenceId?: string | null;
    reason?: string | null;
    actorUserId?: string | null;
  }): Promise<{ movement: StockMovementRecord; newQuantity: number }>;

  listSuppliers(tenantId: string): Promise<SupplierRecord[]>;
  createSupplier(input: Omit<SupplierRecord, 'id'>): Promise<SupplierRecord>;

  listPurchaseOrders(tenantId: string): Promise<PurchaseOrderRecord[]>;
  findPurchaseOrderById(tenantId: string, poId: string): Promise<PurchaseOrderRecord | null>;
  createPurchaseOrder(input: Omit<PurchaseOrderRecord, 'id' | 'receivedAt'>): Promise<PurchaseOrderRecord>;
  markPurchaseOrderReceived(tenantId: string, poId: string): Promise<PurchaseOrderRecord | null>;
}
