import crypto from 'node:crypto';
import type {
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

export class InMemoryFinanceStore implements FinanceStore {
  private estimates = new Map<string, EstimateRecord>();
  private invoices = new Map<string, InvoiceRecord>();
  private payments = new Map<string, PaymentRecord>();
  private creditNotes: NoteRecord[] = [];
  private debitNotes: NoteRecord[] = [];
  private expenses: ExpenseRecord[] = [];
  private commissions: CommissionRecord[] = [];
  private audits: FinancialAuditRecord[] = [];

  async createEstimate(input: Omit<EstimateRecord, 'id' | 'approvedAt'>) {
    const rec: EstimateRecord = { id: crypto.randomUUID(), approvedAt: null, ...input };
    this.estimates.set(rec.id, rec);
    return rec;
  }

  async findEstimateById(tenantId: string, id: string) {
    const e = this.estimates.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }

  async approveEstimate(tenantId: string, id: string) {
    const e = await this.findEstimateById(tenantId, id);
    if (!e) return null;
    const updated: EstimateRecord = { ...e, status: 'APPROVED', approvedAt: new Date() };
    this.estimates.set(id, updated);
    return updated;
  }

  async createInvoice(
    input: Omit<InvoiceRecord, 'id' | 'finalizedAt' | 'items'>,
    items: Omit<InvoiceItemRecord, 'id'>[],
  ) {
    const rec: InvoiceRecord = {
      id: crypto.randomUUID(),
      finalizedAt: null,
      ...input,
      items: items.map((it) => ({ id: crypto.randomUUID(), ...it })),
    };
    this.invoices.set(rec.id, rec);
    return rec;
  }

  async findInvoiceById(tenantId: string, id: string) {
    const inv = this.invoices.get(id);
    return inv && inv.tenantId === tenantId ? inv : null;
  }

  async listOutstandingInvoices(tenantId: string) {
    return [...this.invoices.values()].filter(
      (i) => i.tenantId === tenantId && i.balanceDue !== '0.00' && i.status !== 'VOID',
    );
  }

  async updateDraftInvoice(
    tenantId: string,
    id: string,
    patch: { customerGstin?: string | null; businessGstin?: string | null },
  ) {
    const inv = await this.findInvoiceById(tenantId, id);
    if (!inv) return null;
    const updated = { ...inv, ...patch };
    this.invoices.set(id, updated);
    return updated;
  }

  async finalizeInvoice(tenantId: string, id: string) {
    const inv = await this.findInvoiceById(tenantId, id);
    if (!inv) return null;
    const updated: InvoiceRecord = { ...inv, status: 'FINALIZED', finalizedAt: new Date() };
    this.invoices.set(id, updated);
    return updated;
  }

  async applyInvoicePaymentTotals(
    tenantId: string,
    id: string,
    patch: { paidTotal: string; balanceDue: string; status: InvoiceRecord['status'] },
  ) {
    const inv = await this.findInvoiceById(tenantId, id);
    if (!inv) return null;
    const updated = { ...inv, ...patch };
    this.invoices.set(id, updated);
    return updated;
  }

  async createPayment(
    input: Omit<PaymentRecord, 'id' | 'paidAt' | 'reconciledAt' | 'refundedAmount'>,
  ) {
    const rec: PaymentRecord = {
      id: crypto.randomUUID(),
      refundedAmount: '0.00',
      paidAt: new Date(),
      reconciledAt: null,
      ...input,
    };
    this.payments.set(rec.id, rec);
    return rec;
  }

  async findPaymentById(tenantId: string, id: string) {
    const p = this.payments.get(id);
    return p && p.tenantId === tenantId ? p : null;
  }

  async reconcilePayment(tenantId: string, id: string) {
    const p = await this.findPaymentById(tenantId, id);
    if (!p) return null;
    const updated: PaymentRecord = { ...p, status: 'RECONCILED', reconciledAt: new Date() };
    this.payments.set(id, updated);
    return updated;
  }

  async refundPayment(tenantId: string, id: string, refundedAmount: string) {
    const p = await this.findPaymentById(tenantId, id);
    if (!p) return null;
    const updated: PaymentRecord = { ...p, status: 'REFUNDED', refundedAmount };
    this.payments.set(id, updated);
    return updated;
  }

  async createCreditNote(input: Omit<NoteRecord, 'id' | 'issuedAt'>) {
    const rec: NoteRecord = { id: crypto.randomUUID(), issuedAt: new Date(), ...input };
    this.creditNotes.push(rec);
    return rec;
  }

  async createDebitNote(input: Omit<NoteRecord, 'id' | 'issuedAt'>) {
    const rec: NoteRecord = { id: crypto.randomUUID(), issuedAt: new Date(), ...input };
    this.debitNotes.push(rec);
    return rec;
  }

  async listExpenses(tenantId: string) {
    return this.expenses.filter((e) => e.tenantId === tenantId);
  }

  async createExpense(input: Omit<ExpenseRecord, 'id' | 'incurredAt'>) {
    const rec: ExpenseRecord = { id: crypto.randomUUID(), incurredAt: new Date(), ...input };
    this.expenses.push(rec);
    return rec;
  }

  async listCommissions(tenantId: string) {
    return this.commissions.filter((c) => c.tenantId === tenantId);
  }

  async createCommission(input: Omit<CommissionRecord, 'id'>) {
    const rec: CommissionRecord = { id: crypto.randomUUID(), ...input };
    this.commissions.push(rec);
    return rec;
  }

  async recordAudit(input: Omit<FinancialAuditRecord, 'id' | 'createdAt'>) {
    const rec: FinancialAuditRecord = { id: crypto.randomUUID(), createdAt: new Date(), ...input };
    this.audits.push(rec);
    return rec;
  }

  async listAuditLogs(tenantId: string, entityId?: string) {
    return this.audits.filter(
      (a) => a.tenantId === tenantId && (!entityId || a.entityId === entityId),
    );
  }
}
