import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INVENTORY_STORE,
  type InventoryStore,
  type PurchaseOrderItem,
} from './inventory.store';

@Injectable()
export class InventoryService {
  constructor(@Inject(INVENTORY_STORE) private readonly store: InventoryStore) {}

  async listProducts(tenantId: string) {
    return this.store.listProducts(tenantId);
  }

  async createProduct(
    tenantId: string,
    input: {
      sku: string;
      barcode?: string;
      qrCode?: string;
      name: string;
      category: string;
      unitPrice: string;
      reorderThreshold?: number;
    },
  ) {
    if (!input.sku?.trim() || !input.name?.trim()) {
      throw new BadRequestException('SKU and product name are required');
    }
    return this.store.createProduct({
      tenantId,
      sku: input.sku.trim().toUpperCase(),
      barcode: input.barcode ?? null,
      qrCode: input.qrCode ?? null,
      name: input.name.trim(),
      category: input.category,
      unitPrice: input.unitPrice,
      reorderThreshold: input.reorderThreshold ?? 5,
    });
  }

  async listWarehouses(tenantId: string) {
    return this.store.listWarehouses(tenantId);
  }

  async createWarehouse(
    tenantId: string,
    input: {
      branchId?: string;
      name: string;
      code: string;
      warehouseType?: 'MAIN' | 'VEHICLE';
      assignedTechnicianId?: string;
    },
  ) {
    return this.store.createWarehouse({
      tenantId,
      branchId: input.branchId ?? null,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      warehouseType: input.warehouseType ?? 'MAIN',
      assignedTechnicianId: input.assignedTechnicianId ?? null,
    });
  }

  async adjustStock(
    tenantId: string,
    actorUserId: string,
    input: { warehouseId: string; productId: string; quantityDelta: number; reason: string },
  ) {
    if (input.quantityDelta === 0) {
      throw new BadRequestException('quantityDelta cannot be zero');
    }
    return this.store.recordMovement({
      tenantId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      movementType: 'ADJUSTMENT',
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      actorUserId,
    });
  }

  async transferStock(
    tenantId: string,
    actorUserId: string,
    input: { fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: number },
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be positive');
    }
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must differ');
    }

    const out = await this.store.recordMovement({
      tenantId,
      warehouseId: input.fromWarehouseId,
      productId: input.productId,
      movementType: 'TRANSFER_OUT',
      quantityDelta: -input.quantity,
      reason: `Transfer to ${input.toWarehouseId}`,
      actorUserId,
    });

    const into = await this.store.recordMovement({
      tenantId,
      warehouseId: input.toWarehouseId,
      productId: input.productId,
      movementType: 'TRANSFER_IN',
      quantityDelta: input.quantity,
      reason: `Transfer from ${input.fromWarehouseId}`,
      actorUserId,
    });

    return { outMovement: out.movement, inMovement: into.movement };
  }

  async consumePartsForJob(
    tenantId: string,
    actorUserId: string,
    input: { workOrderId: string; warehouseId: string; productId: string; quantity: number },
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Consumed quantity must be positive');
    }
    return this.store.recordMovement({
      tenantId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      movementType: 'JOB_CONSUMPTION',
      quantityDelta: -input.quantity,
      referenceType: 'WORK_ORDER',
      referenceId: input.workOrderId,
      reason: `Consumed on work order ${input.workOrderId}`,
      actorUserId,
    });
  }

  async getLowStockAlerts(tenantId: string) {
    const [products, balances] = await Promise.all([
      this.store.listProducts(tenantId),
      this.store.listBalances(tenantId),
    ]);

    const totals = new Map<string, number>();
    for (const b of balances) {
      totals.set(b.productId, (totals.get(b.productId) ?? 0) + b.quantity);
    }

    return products
      .map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        totalQuantity: totals.get(p.id) ?? 0,
        reorderThreshold: p.reorderThreshold,
      }))
      .filter((row) => row.totalQuantity <= row.reorderThreshold);
  }

  async listMovements(tenantId: string, productId?: string) {
    return this.store.listMovements(tenantId, productId);
  }

  async listSuppliers(tenantId: string) {
    return this.store.listSuppliers(tenantId);
  }

  async createSupplier(
    tenantId: string,
    input: { name: string; phone: string; email?: string; gstin?: string },
  ) {
    return this.store.createSupplier({
      tenantId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      gstin: input.gstin ?? null,
    });
  }

  async listPurchaseOrders(tenantId: string) {
    return this.store.listPurchaseOrders(tenantId);
  }

  async createPurchaseOrder(
    tenantId: string,
    input: {
      supplierId: string;
      warehouseId: string;
      items: PurchaseOrderItem[];
      totalAmount: string;
    },
  ) {
    if (input.items.length === 0) {
      throw new BadRequestException('Purchase order must contain at least one item');
    }
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    return this.store.createPurchaseOrder({
      tenantId,
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      poNumber,
      status: 'ORDERED',
      items: input.items,
      totalAmount: input.totalAmount,
    });
  }

  async receivePurchaseOrder(tenantId: string, poId: string, actorUserId: string) {
    const po = await this.store.findPurchaseOrderById(tenantId, poId);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('Purchase order already received');
    }

    for (const item of po.items) {
      await this.store.recordMovement({
        tenantId,
        warehouseId: po.warehouseId,
        productId: item.productId,
        movementType: 'PURCHASE_RECEIPT',
        quantityDelta: item.quantity,
        referenceType: 'PURCHASE_ORDER',
        referenceId: po.id,
        reason: `Received ${po.poNumber}`,
        actorUserId,
      });
    }

    return this.store.markPurchaseOrderReceived(tenantId, poId);
  }
}
