import { Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type {
  BillingLineInput,
  CommissionRecord,
  EstimateRecord,
  ExpenseRecord,
  FinanceStore,
  FinancialAuditRecord,
  InvoiceItemRecord,
  InvoiceRecord,
  NoteRecord,
  PaymentRecord,
} from './finance.store';

@Injectable()
export class PrismaFinanceStore implements FinanceStore {
  async createEstimate(input: Omit<EstimateRecord, 'id' | 'approvedAt'>): Promise<EstimateRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.estimate.create({
        data: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          workOrderId: input.workOrderId,
          estimateNumber: input.estimateNumber,
          currency: input.currency,
          status: input.status,
          items: input.items as unknown as Prisma.InputJsonValue,
          subtotal: input.subtotal,
          discountTotal: input.discountTotal,
          taxTotal: input.taxTotal,
          grandTotal: input.grandTotal,
        },
      }),
    );
    return {
      ...row,
      status: row.status as EstimateRecord['status'],
      items: row.items as unknown as BillingLineInput[],
      subtotal: row.subtotal.toString(),
      discountTotal: row.discountTotal.toString(),
      taxTotal: row.taxTotal.toString(),
      grandTotal: row.grandTotal.toString(),
    };
  }

  async findEstimateById(tenantId: string, id: string): Promise<EstimateRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.estimate.findFirst({ where: { id, tenantId } }),
    );
    if (!row) return null;
    return {
      ...row,
      status: row.status as EstimateRecord['status'],
      items: row.items as unknown as BillingLineInput[],
      subtotal: row.subtotal.toString(),
      discountTotal: row.discountTotal.toString(),
      taxTotal: row.taxTotal.toString(),
      grandTotal: row.grandTotal.toString(),
    };
  }

  async approveEstimate(tenantId: string, id: string): Promise<EstimateRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.estimate.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const row = await tx.estimate.update({
        where: { id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
      return {
        ...row,
        status: row.status as EstimateRecord['status'],
        items: row.items as unknown as BillingLineInput[],
        subtotal: row.subtotal.toString(),
        discountTotal: row.discountTotal.toString(),
        taxTotal: row.taxTotal.toString(),
        grandTotal: row.grandTotal.toString(),
      };
    });
  }

  async createInvoice(
    input: Omit<InvoiceRecord, 'id' | 'finalizedAt' | 'items'>,
    items: Omit<InvoiceItemRecord, 'id'>[],
  ): Promise<InvoiceRecord> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          ...input,
          items: {
            create: items.map((it) => ({ ...it, tenantId: input.tenantId })),
          },
        },
        include: { items: true },
      });
      return this.mapInvoice(inv);
    });
  }

  async findInvoiceById(tenantId: string, id: string): Promise<InvoiceRecord | null> {
    const inv = await withTenantTransaction(tenantId, (tx) =>
      tx.invoice.findFirst({ where: { id, tenantId }, include: { items: true } }),
    );
    return inv ? this.mapInvoice(inv) : null;
  }

  async listOutstandingInvoices(tenantId: string): Promise<InvoiceRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.invoice.findMany({
        where: { tenantId, balanceDue: { gt: 0 }, status: { not: 'VOID' } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map((r) => this.mapInvoice(r));
  }

  async updateDraftInvoice(
    tenantId: string,
    id: string,
    patch: { customerGstin?: string | null; businessGstin?: string | null },
  ): Promise<InvoiceRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.invoice.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const updated = await tx.invoice.update({
        where: { id },
        data: patch,
        include: { items: true },
      });
      return this.mapInvoice(updated);
    });
  }

  async finalizeInvoice(tenantId: string, id: string): Promise<InvoiceRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.invoice.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
        include: { items: true },
      });
      return this.mapInvoice(updated);
    });
  }

  async applyInvoicePaymentTotals(
    tenantId: string,
    id: string,
    patch: { paidTotal: string; balanceDue: string; status: InvoiceRecord['status'] },
  ): Promise<InvoiceRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.invoice.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const updated = await tx.invoice.update({
        where: { id },
        data: patch,
        include: { items: true },
      });
      return this.mapInvoice(updated);
    });
  }

  async createPayment(
    input: Omit<PaymentRecord, 'id' | 'paidAt' | 'reconciledAt' | 'refundedAmount'>,
  ): Promise<PaymentRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.payment.create({ data: input }),
    );
    return {
      ...row,
      amount: row.amount.toString(),
      refundedAmount: row.refundedAmount.toString(),
      method: row.method as PaymentRecord['method'],
      status: row.status as PaymentRecord['status'],
    };
  }

  async findPaymentById(tenantId: string, id: string): Promise<PaymentRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.payment.findFirst({ where: { id, tenantId } }),
    );
    if (!row) return null;
    return {
      ...row,
      amount: row.amount.toString(),
      refundedAmount: row.refundedAmount.toString(),
      method: row.method as PaymentRecord['method'],
      status: row.status as PaymentRecord['status'],
    };
  }

  async reconcilePayment(tenantId: string, id: string): Promise<PaymentRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.payment.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const row = await tx.payment.update({
        where: { id },
        data: { status: 'RECONCILED', reconciledAt: new Date() },
      });
      return {
        ...row,
        amount: row.amount.toString(),
        refundedAmount: row.refundedAmount.toString(),
        method: row.method as PaymentRecord['method'],
        status: row.status as PaymentRecord['status'],
      };
    });
  }

  async refundPayment(tenantId: string, id: string, refundedAmount: string): Promise<PaymentRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.payment.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const row = await tx.payment.update({
        where: { id },
        data: { status: 'REFUNDED', refundedAmount },
      });
      return {
        ...row,
        amount: row.amount.toString(),
        refundedAmount: row.refundedAmount.toString(),
        method: row.method as PaymentRecord['method'],
        status: row.status as PaymentRecord['status'],
      };
    });
  }

  async createCreditNote(input: Omit<NoteRecord, 'id' | 'issuedAt'>): Promise<NoteRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.creditNote.create({ data: input }),
    );
    return { ...row, amount: row.amount.toString() };
  }

  async createDebitNote(input: Omit<NoteRecord, 'id' | 'issuedAt'>): Promise<NoteRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.debitNote.create({ data: input }),
    );
    return { ...row, amount: row.amount.toString() };
  }

  async listExpenses(tenantId: string): Promise<ExpenseRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.expense.findMany({ where: { tenantId }, orderBy: { incurredAt: 'desc' } }),
    );
    return rows.map((e) => ({ ...e, amount: e.amount.toString() }));
  }

  async createExpense(input: Omit<ExpenseRecord, 'id' | 'incurredAt'>): Promise<ExpenseRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.expense.create({ data: input }),
    );
    return { ...row, amount: row.amount.toString() };
  }

  async listCommissions(tenantId: string): Promise<CommissionRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.technicianCommission.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    );
    return rows.map((c) => ({
      ...c,
      amount: c.amount.toString(),
      status: c.status as CommissionRecord['status'],
    }));
  }

  async createCommission(input: Omit<CommissionRecord, 'id'>): Promise<CommissionRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.technicianCommission.create({ data: input }),
    );
    return {
      ...row,
      amount: row.amount.toString(),
      status: row.status as CommissionRecord['status'],
    };
  }

  async recordAudit(input: Omit<FinancialAuditRecord, 'id' | 'createdAt'>): Promise<FinancialAuditRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.financialAuditLog.create({
        data: {
          tenantId: input.tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          actorUserId: input.actorUserId,
          snapshot: input.snapshot as Prisma.InputJsonValue,
        },
      }),
    );
    return { ...row, snapshot: row.snapshot as Record<string, unknown> };
  }

  async listAuditLogs(tenantId: string, entityId?: string): Promise<FinancialAuditRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.financialAuditLog.findMany({
        where: { tenantId, ...(entityId ? { entityId } : {}) },
        orderBy: { createdAt: 'asc' },
      }),
    );
    return rows.map((r) => ({ ...r, snapshot: r.snapshot as Record<string, unknown> }));
  }

  private mapInvoice(
    inv: Prisma.InvoiceGetPayload<{ include: { items: true } }>,
  ): InvoiceRecord {
    return {
      ...inv,
      status: inv.status as InvoiceRecord['status'],
      subtotal: inv.subtotal.toString(),
      discountTotal: inv.discountTotal.toString(),
      cgstTotal: inv.cgstTotal.toString(),
      sgstTotal: inv.sgstTotal.toString(),
      igstTotal: inv.igstTotal.toString(),
      taxTotal: inv.taxTotal.toString(),
      grandTotal: inv.grandTotal.toString(),
      paidTotal: inv.paidTotal.toString(),
      balanceDue: inv.balanceDue.toString(),
      items: inv.items.map((it) => ({
        ...it,
        quantity: it.quantity.toString(),
        unitPrice: it.unitPrice.toString(),
        discountAmount: it.discountAmount.toString(),
        taxRatePercent: it.taxRatePercent.toString(),
        taxAmount: it.taxAmount.toString(),
        lineTotal: it.lineTotal.toString(),
      })),
    };
  }
}
