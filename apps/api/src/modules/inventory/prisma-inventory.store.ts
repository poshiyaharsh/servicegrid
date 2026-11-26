import { BadRequestException, Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type {
  InventoryStore,
  MovementType,
  ProductRecord,
  PurchaseOrderItem,
  PurchaseOrderRecord,
  StockBalanceRecord,
  StockMovementRecord,
  SupplierRecord,
  WarehouseRecord,
} from './inventory.store';

@Injectable()
export class PrismaInventoryStore implements InventoryStore {
  async listProducts(tenantId: string): Promise<ProductRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.product.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    );
    return rows.map((p) => ({ ...p, unitPrice: p.unitPrice.toString() }));
  }

  async createProduct(input: Omit<ProductRecord, 'id' | 'isActive'>): Promise<ProductRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.product.create({
        data: {
          tenantId: input.tenantId,
          sku: input.sku,
          barcode: input.barcode,
          qrCode: input.qrCode,
          name: input.name,
          category: input.category,
          unitPrice: input.unitPrice,
          reorderThreshold: input.reorderThreshold,
        },
      }),
    );
    return { ...row, unitPrice: row.unitPrice.toString() };
  }

  async listWarehouses(tenantId: string): Promise<WarehouseRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.warehouse.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    );
    return rows.map((w) => ({ ...w, warehouseType: w.warehouseType as 'MAIN' | 'VEHICLE' }));
  }

  async createWarehouse(input: Omit<WarehouseRecord, 'id'>): Promise<WarehouseRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.warehouse.create({ data: input }),
    );
    return { ...row, warehouseType: row.warehouseType as 'MAIN' | 'VEHICLE' };
  }

  async getStockBalance(tenantId: string, warehouseId: string, productId: string): Promise<number> {
    return withTenantTransaction(tenantId, async (tx) => {
      const bal = await tx.stockBalance.findFirst({ where: { tenantId, warehouseId, productId } });
      return bal?.quantity ?? 0;
    });
  }

  async listBalances(tenantId: string, warehouseId?: string): Promise<StockBalanceRecord[]> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.stockBalance.findMany({
        where: { tenantId, ...(warehouseId ? { warehouseId } : {}) },
        select: { warehouseId: true, productId: true, quantity: true },
      }),
    );
  }

  async listMovements(tenantId: string, productId?: string): Promise<StockMovementRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.stockMovement.findMany({
        where: { tenantId, ...(productId ? { productId } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map((m) => ({ ...m, movementType: m.movementType as MovementType }));
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
  }): Promise<{ movement: StockMovementRecord; newQuantity: number }> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const existing = await tx.stockBalance.findFirst({
        where: {
          tenantId: input.tenantId,
          warehouseId: input.warehouseId,
          productId: input.productId,
        },
      });
      const currentQty = existing?.quantity ?? 0;
      const nextQty = currentQty + input.quantityDelta;
      if (nextQty < 0) {
        throw new BadRequestException('Insufficient stock for operation');
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId: input.tenantId,
          warehouseId: input.warehouseId,
          productId: input.productId,
          movementType: input.movementType,
          quantityDelta: input.quantityDelta,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          reason: input.reason ?? null,
          actorUserId: input.actorUserId ?? null,
        },
      });

      if (existing) {
        await tx.stockBalance.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        });
      } else {
        await tx.stockBalance.create({
          data: {
            tenantId: input.tenantId,
            warehouseId: input.warehouseId,
            productId: input.productId,
            quantity: nextQty,
          },
        });
      }

      return {
        movement: { ...movement, movementType: movement.movementType as MovementType },
        newQuantity: nextQty,
      };
    });
  }

  async listSuppliers(tenantId: string): Promise<SupplierRecord[]> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    );
  }

  async createSupplier(input: Omit<SupplierRecord, 'id'>): Promise<SupplierRecord> {
    return withTenantTransaction(input.tenantId, (tx) => tx.supplier.create({ data: input }));
  }

  async listPurchaseOrders(tenantId: string): Promise<PurchaseOrderRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.purchaseOrder.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    );
    return rows.map((po) => ({
      ...po,
      status: po.status as PurchaseOrderRecord['status'],
      items: po.items as unknown as PurchaseOrderItem[],
      totalAmount: po.totalAmount.toString(),
    }));
  }

  async findPurchaseOrderById(tenantId: string, poId: string): Promise<PurchaseOrderRecord | null> {
    const po = await withTenantTransaction(tenantId, (tx) =>
      tx.purchaseOrder.findFirst({ where: { id: poId, tenantId } }),
    );
    if (!po) return null;
    return {
      ...po,
      status: po.status as PurchaseOrderRecord['status'],
      items: po.items as unknown as PurchaseOrderItem[],
      totalAmount: po.totalAmount.toString(),
    };
  }

  async createPurchaseOrder(
    input: Omit<PurchaseOrderRecord, 'id' | 'receivedAt'>,
  ): Promise<PurchaseOrderRecord> {
    const po = await withTenantTransaction(input.tenantId, (tx) =>
      tx.purchaseOrder.create({
        data: {
          tenantId: input.tenantId,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          poNumber: input.poNumber,
          status: input.status,
          items: input.items as unknown as Prisma.InputJsonValue,
          totalAmount: input.totalAmount,
        },
      }),
    );
    return {
      ...po,
      status: po.status as PurchaseOrderRecord['status'],
      items: po.items as unknown as PurchaseOrderItem[],
      totalAmount: po.totalAmount.toString(),
    };
  }

  async markPurchaseOrderReceived(tenantId: string, poId: string): Promise<PurchaseOrderRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.purchaseOrder.findFirst({ where: { id: poId, tenantId } });
      if (!existing) return null;
      const po = await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      });
      return {
        ...po,
        status: po.status as PurchaseOrderRecord['status'],
        items: po.items as unknown as PurchaseOrderItem[],
        totalAmount: po.totalAmount.toString(),
      };
    });
  }
}
