import { BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import type {
  InventoryStore,
  MovementType,
  ProductRecord,
  PurchaseOrderRecord,
  StockBalanceRecord,
  StockMovementRecord,
  SupplierRecord,
  WarehouseRecord,
} from './inventory.store';

export class InMemoryInventoryStore implements InventoryStore {
  private products = new Map<string, ProductRecord>();
  private warehouses = new Map<string, WarehouseRecord>();
  private balances = new Map<string, number>();
  private movements: StockMovementRecord[] = [];
  private suppliers = new Map<string, SupplierRecord>();
  private purchaseOrders = new Map<string, PurchaseOrderRecord>();

  private balanceKey(tenantId: string, warehouseId: string, productId: string) {
    return `${tenantId}:${warehouseId}:${productId}`;
  }

  async listProducts(tenantId: string) {
    return [...this.products.values()].filter((p) => p.tenantId === tenantId);
  }

  async createProduct(input: Omit<ProductRecord, 'id' | 'isActive'>) {
    const rec: ProductRecord = { id: crypto.randomUUID(), isActive: true, ...input };
    this.products.set(rec.id, rec);
    return rec;
  }

  async listWarehouses(tenantId: string) {
    return [...this.warehouses.values()].filter((w) => w.tenantId === tenantId);
  }

  async createWarehouse(input: Omit<WarehouseRecord, 'id'>) {
    const rec: WarehouseRecord = { id: crypto.randomUUID(), ...input };
    this.warehouses.set(rec.id, rec);
    return rec;
  }

  async getStockBalance(tenantId: string, warehouseId: string, productId: string) {
    return this.balances.get(this.balanceKey(tenantId, warehouseId, productId)) ?? 0;
  }

  async listBalances(tenantId: string, warehouseId?: string): Promise<StockBalanceRecord[]> {
    const out: StockBalanceRecord[] = [];
    for (const [key, quantity] of this.balances.entries()) {
      const [tId, wId, pId] = key.split(':');
      if (tId === tenantId && (!warehouseId || wId === warehouseId)) {
        out.push({ warehouseId: wId!, productId: pId!, quantity });
      }
    }
    return out;
  }

  async listMovements(tenantId: string, productId?: string) {
    return this.movements.filter(
      (m) => m.tenantId === tenantId && (!productId || m.productId === productId),
    );
  }

  async recordMovement(input: {
    tenantId: string;
    warehouseId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    referenceType?: string | null;
    referenceId?: string | null;
    reason?: string | null;
    actorUserId?: string | null;
  }) {
    const key = this.balanceKey(input.tenantId, input.warehouseId, input.productId);
    const current = this.balances.get(key) ?? 0;
    const next = current + input.quantityDelta;
    if (next < 0) {
      throw new BadRequestException('Insufficient stock for operation');
    }

    const movement: StockMovementRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      movementType: input.movementType,
      quantityDelta: input.quantityDelta,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      reason: input.reason ?? null,
      actorUserId: input.actorUserId ?? null,
      createdAt: new Date(),
    };
    this.movements.push(movement);
    this.balances.set(key, next);
    return { movement, newQuantity: next };
  }

  async listSuppliers(tenantId: string) {
    return [...this.suppliers.values()].filter((s) => s.tenantId === tenantId);
  }

  async createSupplier(input: Omit<SupplierRecord, 'id'>) {
    const rec: SupplierRecord = { id: crypto.randomUUID(), ...input };
    this.suppliers.set(rec.id, rec);
    return rec;
  }

  async listPurchaseOrders(tenantId: string) {
    return [...this.purchaseOrders.values()].filter((po) => po.tenantId === tenantId);
  }

  async findPurchaseOrderById(tenantId: string, poId: string) {
    const po = this.purchaseOrders.get(poId);
    return po && po.tenantId === tenantId ? po : null;
  }

  async createPurchaseOrder(input: Omit<PurchaseOrderRecord, 'id' | 'receivedAt'>) {
    const rec: PurchaseOrderRecord = { id: crypto.randomUUID(), receivedAt: null, ...input };
    this.purchaseOrders.set(rec.id, rec);
    return rec;
  }

  async markPurchaseOrderReceived(tenantId: string, poId: string) {
    const po = await this.findPurchaseOrderById(tenantId, poId);
    if (!po) return null;
    const updated: PurchaseOrderRecord = { ...po, status: 'RECEIVED', receivedAt: new Date() };
    this.purchaseOrders.set(poId, updated);
    return updated;
  }
}
