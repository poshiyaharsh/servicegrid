export interface BillingLineInput {
  description: string;
  hsnSac?: string;
  quantity: string;
  unitPrice: string;
  discountAmount?: string;
  taxRatePercent: string;
}

export interface EstimateRecord {
  id: string;
  tenantId: string;
  customerId: string;
  workOrderId: string | null;
  estimateNumber: string;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
  items: BillingLineInput[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  approvedAt: Date | null;
}

export interface InvoiceItemRecord {
  id: string;
  description: string;
  hsnSac: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxRatePercent: string;
  taxAmount: string;
  lineTotal: string;
}

export interface InvoiceRecord {
  id: string;
  tenantId: string;
  customerId: string;
  workOrderId: string | null;
  estimateId: string | null;
  invoiceNumber: string;
  currency: string;
  fiscalYear: string;
  businessGstin: string | null;
  customerGstin: string | null;
  isInterState: boolean;
  status: 'DRAFT' | 'FINALIZED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
  subtotal: string;
  discountTotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  taxTotal: string;
  grandTotal: string;
  paidTotal: string;
  balanceDue: string;
  finalizedAt: Date | null;
  items: InvoiceItemRecord[];
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: string;
  method: 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'SANDBOX_GATEWAY';
  reference: string | null;
  status: 'RECORDED' | 'RECONCILED' | 'REFUNDED';
  refundedAmount: string;
  paidAt: Date;
  reconciledAt: Date | null;
}

export interface NoteRecord {
  id: string;
  tenantId: string;
  invoiceId: string;
  noteNumber: string;
  amount: string;
  reason: string;
  issuedAt: Date;
}

export interface ExpenseRecord {
  id: string;
  tenantId: string;
  workOrderId: string | null;
  technicianId: string | null;
  category: string;
  amount: string;
  currency: string;
  notes: string | null;
  incurredAt: Date;
}

export interface CommissionRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  technicianId: string;
  amount: string;
  status: 'PENDING' | 'APPROVED' | 'PAID';
}

export interface FinancialAuditRecord {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  snapshot: Record<string, unknown>;
  createdAt: Date;
}

export const FINANCE_STORE = Symbol('FINANCE_STORE');

export interface FinanceStore {
  createEstimate(input: Omit<EstimateRecord, 'id' | 'approvedAt'>): Promise<EstimateRecord>;
  findEstimateById(tenantId: string, id: string): Promise<EstimateRecord | null>;
  approveEstimate(tenantId: string, id: string): Promise<EstimateRecord | null>;

  createInvoice(
    input: Omit<InvoiceRecord, 'id' | 'finalizedAt' | 'items'>,
    items: Omit<InvoiceItemRecord, 'id'>[],
  ): Promise<InvoiceRecord>;
  findInvoiceById(tenantId: string, id: string): Promise<InvoiceRecord | null>;
  listOutstandingInvoices(tenantId: string): Promise<InvoiceRecord[]>;
  updateDraftInvoice(
    tenantId: string,
    id: string,
    patch: { customerGstin?: string | null; businessGstin?: string | null },
  ): Promise<InvoiceRecord | null>;
  finalizeInvoice(tenantId: string, id: string): Promise<InvoiceRecord | null>;
  applyInvoicePaymentTotals(
    tenantId: string,
    id: string,
    patch: { paidTotal: string; balanceDue: string; status: InvoiceRecord['status'] },
  ): Promise<InvoiceRecord | null>;

  createPayment(input: Omit<PaymentRecord, 'id' | 'paidAt' | 'reconciledAt' | 'refundedAmount'>): Promise<PaymentRecord>;
  findPaymentById(tenantId: string, id: string): Promise<PaymentRecord | null>;
  reconcilePayment(tenantId: string, id: string): Promise<PaymentRecord | null>;
  refundPayment(tenantId: string, id: string, refundedAmount: string): Promise<PaymentRecord | null>;

  createCreditNote(input: Omit<NoteRecord, 'id' | 'issuedAt'>): Promise<NoteRecord>;
  createDebitNote(input: Omit<NoteRecord, 'id' | 'issuedAt'>): Promise<NoteRecord>;

  listExpenses(tenantId: string): Promise<ExpenseRecord[]>;
  createExpense(input: Omit<ExpenseRecord, 'id' | 'incurredAt'>): Promise<ExpenseRecord>;

  listCommissions(tenantId: string): Promise<CommissionRecord[]>;
  createCommission(input: Omit<CommissionRecord, 'id'>): Promise<CommissionRecord>;

  recordAudit(input: Omit<FinancialAuditRecord, 'id' | 'createdAt'>): Promise<FinancialAuditRecord>;
  listAuditLogs(tenantId: string, entityId?: string): Promise<FinancialAuditRecord[]>;
}
