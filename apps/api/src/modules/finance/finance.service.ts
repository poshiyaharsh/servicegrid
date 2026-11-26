import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { gstinSchema } from '@servicegrid/validation';
import {
  FINANCE_STORE,
  type BillingLineInput,
  type FinanceStore,
  type InvoiceItemRecord,
  type PaymentRecord,
} from './finance.store';
import {
  addDecimals,
  calculateLineAmounts,
  formatMinorToDecimal,
  getFinancialYearLabel,
  parseDecimalToMinor,
  subtractDecimals,
} from './money.util';

@Injectable()
export class FinanceService {
  constructor(@Inject(FINANCE_STORE) private readonly store: FinanceStore) {}

  async createEstimate(
    tenantId: string,
    actorUserId: string,
    input: {
      customerId: string;
      workOrderId?: string;
      currency?: string;
      isInterState?: boolean;
      items: BillingLineInput[];
    },
  ) {
    if (input.items.length === 0) {
      throw new BadRequestException('Estimate must include at least one item');
    }
    const totals = this.computeTotals(input.items, input.isInterState ?? false);
    const estimateNumber = `EST-${Date.now().toString(36).toUpperCase()}`;

    const est = await this.store.createEstimate({
      tenantId,
      customerId: input.customerId,
      workOrderId: input.workOrderId ?? null,
      estimateNumber,
      currency: input.currency ?? 'INR',
      status: 'DRAFT',
      items: input.items,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
    });

    await this.store.recordAudit({
      tenantId,
      entityType: 'ESTIMATE',
      entityId: est.id,
      action: 'CREATED',
      actorUserId,
      snapshot: { estimateNumber: est.estimateNumber, grandTotal: est.grandTotal },
    });

    return est;
  }

  async approveEstimate(tenantId: string, estimateId: string, actorUserId: string) {
    const est = await this.store.approveEstimate(tenantId, estimateId);
    if (!est) throw new NotFoundException('Estimate not found');

    await this.store.recordAudit({
      tenantId,
      entityType: 'ESTIMATE',
      entityId: est.id,
      action: 'APPROVED',
      actorUserId,
      snapshot: { estimateNumber: est.estimateNumber },
    });
    return est;
  }

  async createInvoice(
    tenantId: string,
    actorUserId: string,
    input: {
      customerId: string;
      workOrderId?: string;
      estimateId?: string;
      currency?: string;
      fiscalStartMonth?: number;
      businessGstin?: string;
      customerGstin?: string;
      isInterState?: boolean;
      items: BillingLineInput[];
    },
  ) {
    if (input.items.length === 0) {
      throw new BadRequestException('Invoice must include at least one line item');
    }
    this.validateOptionalGstin(input.businessGstin);
    this.validateOptionalGstin(input.customerGstin);

    const isInterState = input.isInterState ?? false;
    const totals = this.computeTotals(input.items, isInterState);
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const fiscalYear = getFinancialYearLabel(new Date(), input.fiscalStartMonth ?? 4);

    const invoice = await this.store.createInvoice(
      {
        tenantId,
        customerId: input.customerId,
        workOrderId: input.workOrderId ?? null,
        estimateId: input.estimateId ?? null,
        invoiceNumber,
        currency: input.currency ?? 'INR',
        fiscalYear,
        businessGstin: input.businessGstin ?? null,
        customerGstin: input.customerGstin ?? null,
        isInterState,
        status: 'DRAFT',
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        paidTotal: '0.00',
        balanceDue: totals.grandTotal,
      },
      totals.computedItems,
    );

    await this.store.recordAudit({
      tenantId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREATED_DRAFT',
      actorUserId,
      snapshot: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
    });

    return invoice;
  }

  async convertEstimateToInvoice(
    tenantId: string,
    estimateId: string,
    actorUserId: string,
    opts?: { businessGstin?: string; customerGstin?: string; isInterState?: boolean },
  ) {
    const est = await this.store.findEstimateById(tenantId, estimateId);
    if (!est) throw new NotFoundException('Estimate not found');
    if (est.status !== 'APPROVED') {
      throw new BadRequestException('Only approved estimates can be converted to invoices');
    }
    return this.createInvoice(tenantId, actorUserId, {
      customerId: est.customerId,
      workOrderId: est.workOrderId ?? undefined,
      estimateId: est.id,
      currency: est.currency,
      businessGstin: opts?.businessGstin,
      customerGstin: opts?.customerGstin,
      isInterState: opts?.isInterState,
      items: est.items,
    });
  }

  async getInvoice(tenantId: string, id: string) {
    const inv = await this.store.findInvoiceById(tenantId, id);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async updateDraftInvoice(
    tenantId: string,
    id: string,
    actorUserId: string,
    patch: { customerGstin?: string; businessGstin?: string },
  ) {
    const existing = await this.getInvoice(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Finalized invoices are immutable; issue a credit or debit note instead',
      );
    }
    this.validateOptionalGstin(patch.businessGstin);
    this.validateOptionalGstin(patch.customerGstin);

    const updated = await this.store.updateDraftInvoice(tenantId, id, patch);
    await this.store.recordAudit({
      tenantId,
      entityType: 'INVOICE',
      entityId: id,
      action: 'UPDATED_DRAFT',
      actorUserId,
      snapshot: patch,
    });
    return updated;
  }

  async finalizeInvoice(tenantId: string, id: string, actorUserId: string) {
    const existing = await this.getInvoice(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Invoice is already finalized');
    }
    const finalized = await this.store.finalizeInvoice(tenantId, id);
    await this.store.recordAudit({
      tenantId,
      entityType: 'INVOICE',
      entityId: id,
      action: 'FINALIZED',
      actorUserId,
      snapshot: { invoiceNumber: existing.invoiceNumber, grandTotal: existing.grandTotal },
    });
    return finalized;
  }

  async issueCreditNote(
    tenantId: string,
    invoiceId: string,
    actorUserId: string,
    input: { amount: string; reason: string },
  ) {
    const inv = await this.getInvoice(tenantId, invoiceId);
    if (inv.status === 'DRAFT') {
      throw new BadRequestException('Cannot issue credit note on a draft invoice');
    }
    const amountMinor = parseDecimalToMinor(input.amount);
    const balMinor = parseDecimalToMinor(inv.balanceDue);
    if (amountMinor <= 0n || amountMinor > balMinor) {
      throw new BadRequestException('Credit note amount must be > 0 and <= balanceDue');
    }

    const note = await this.store.createCreditNote({
      tenantId,
      invoiceId,
      noteNumber: `CN-${Date.now().toString(36).toUpperCase()}`,
      amount: formatMinorToDecimal(amountMinor),
      reason: input.reason,
    });

    const newBalance = subtractDecimals(inv.balanceDue, note.amount);
    const nextStatus = parseDecimalToMinor(newBalance) === 0n ? 'PAID' : inv.status;
    await this.store.applyInvoicePaymentTotals(tenantId, invoiceId, {
      paidTotal: inv.paidTotal,
      balanceDue: newBalance,
      status: nextStatus,
    });

    await this.store.recordAudit({
      tenantId,
      entityType: 'CREDIT_NOTE',
      entityId: note.id,
      action: 'ISSUED',
      actorUserId,
      snapshot: { invoiceId, amount: note.amount, reason: note.reason },
    });
    return note;
  }

  async issueDebitNote(
    tenantId: string,
    invoiceId: string,
    actorUserId: string,
    input: { amount: string; reason: string },
  ) {
    const inv = await this.getInvoice(tenantId, invoiceId);
    if (inv.status === 'DRAFT') {
      throw new BadRequestException('Cannot issue debit note on a draft invoice');
    }
    const amountMinor = parseDecimalToMinor(input.amount);
    if (amountMinor <= 0n) {
      throw new BadRequestException('Debit note amount must be positive');
    }

    const note = await this.store.createDebitNote({
      tenantId,
      invoiceId,
      noteNumber: `DN-${Date.now().toString(36).toUpperCase()}`,
      amount: formatMinorToDecimal(amountMinor),
      reason: input.reason,
    });

    const newBalance = addDecimals(inv.balanceDue, note.amount);
    const nextStatus = inv.status === 'PAID' ? 'PARTIALLY_PAID' : inv.status;
    await this.store.applyInvoicePaymentTotals(tenantId, invoiceId, {
      paidTotal: inv.paidTotal,
      balanceDue: newBalance,
      status: nextStatus,
    });

    await this.store.recordAudit({
      tenantId,
      entityType: 'DEBIT_NOTE',
      entityId: note.id,
      action: 'ISSUED',
      actorUserId,
      snapshot: { invoiceId, amount: note.amount, reason: note.reason },
    });
    return note;
  }

  async recordPayment(
    tenantId: string,
    actorUserId: string,
    input: {
      invoiceId: string;
      amount: string;
      method: PaymentRecord['method'];
      reference?: string;
    },
  ) {
    const inv = await this.getInvoice(tenantId, input.invoiceId);
    if (inv.status === 'DRAFT' || inv.status === 'VOID') {
      throw new BadRequestException('Invoice must be finalized before recording payments');
    }

    const payMinor = parseDecimalToMinor(input.amount);
    const balMinor = parseDecimalToMinor(inv.balanceDue);
    if (payMinor <= 0n || payMinor > balMinor) {
      throw new BadRequestException('Payment amount must be > 0 and <= balanceDue');
    }

    const formattedAmount = formatMinorToDecimal(payMinor);
    const payment = await this.store.createPayment({
      tenantId,
      invoiceId: inv.id,
      amount: formattedAmount,
      method: input.method,
      reference: input.reference ?? null,
      status: 'RECORDED',
    });

    const nextPaid = addDecimals(inv.paidTotal, formattedAmount);
    const nextBalance = subtractDecimals(inv.balanceDue, formattedAmount);
    const nextStatus = parseDecimalToMinor(nextBalance) === 0n ? 'PAID' : 'PARTIALLY_PAID';

    await this.store.applyInvoicePaymentTotals(tenantId, inv.id, {
      paidTotal: nextPaid,
      balanceDue: nextBalance,
      status: nextStatus,
    });

    await this.store.recordAudit({
      tenantId,
      entityType: 'PAYMENT',
      entityId: payment.id,
      action: 'RECORDED',
      actorUserId,
      snapshot: { invoiceId: inv.id, amount: formattedAmount, method: input.method },
    });

    return payment;
  }

  async createSandboxUpiIntent(tenantId: string, invoiceId: string) {
    const inv = await this.getInvoice(tenantId, invoiceId);
    return {
      mode: 'SANDBOX',
      invoiceNumber: inv.invoiceNumber,
      amount: inv.balanceDue,
      currency: inv.currency,
      upiUri: `upi://pay?pa=sandbox@fieldsutra&pn=FieldSutraSandbox&tr=${inv.invoiceNumber}&am=${inv.balanceDue}&cu=${inv.currency}`,
    };
  }

  async reconcilePayment(tenantId: string, paymentId: string, actorUserId: string) {
    const payment = await this.store.reconcilePayment(tenantId, paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    await this.store.recordAudit({
      tenantId,
      entityType: 'PAYMENT',
      entityId: payment.id,
      action: 'RECONCILED',
      actorUserId,
      snapshot: { amount: payment.amount },
    });
    return payment;
  }

  async refundPayment(tenantId: string, paymentId: string, amount: string, actorUserId: string) {
    const existing = await this.store.findPaymentById(tenantId, paymentId);
    if (!existing) throw new NotFoundException('Payment not found');

    const refundMinor = parseDecimalToMinor(amount);
    const paidMinor = parseDecimalToMinor(existing.amount);
    if (refundMinor <= 0n || refundMinor > paidMinor) {
      throw new BadRequestException('Invalid refund amount');
    }

    const updated = await this.store.refundPayment(tenantId, paymentId, formatMinorToDecimal(refundMinor));
    await this.store.recordAudit({
      tenantId,
      entityType: 'PAYMENT',
      entityId: paymentId,
      action: 'REFUNDED',
      actorUserId,
      snapshot: { refundedAmount: formatMinorToDecimal(refundMinor) },
    });
    return updated;
  }

  async listOutstandingInvoices(tenantId: string) {
    return this.store.listOutstandingInvoices(tenantId);
  }

  async listExpenses(tenantId: string) {
    return this.store.listExpenses(tenantId);
  }

  async createExpense(
    tenantId: string,
    input: { workOrderId?: string; technicianId?: string; category: string; amount: string; currency?: string; notes?: string },
  ) {
    return this.store.createExpense({
      tenantId,
      workOrderId: input.workOrderId ?? null,
      technicianId: input.technicianId ?? null,
      category: input.category,
      amount: formatMinorToDecimal(parseDecimalToMinor(input.amount)),
      currency: input.currency ?? 'INR',
      notes: input.notes ?? null,
    });
  }

  async listCommissions(tenantId: string) {
    return this.store.listCommissions(tenantId);
  }

  async createCommission(
    tenantId: string,
    input: { workOrderId: string; technicianId: string; amount: string },
  ) {
    return this.store.createCommission({
      tenantId,
      workOrderId: input.workOrderId,
      technicianId: input.technicianId,
      amount: formatMinorToDecimal(parseDecimalToMinor(input.amount)),
      status: 'PENDING',
    });
  }

  async listAuditLogs(tenantId: string, entityId?: string) {
    return this.store.listAuditLogs(tenantId, entityId);
  }

  private validateOptionalGstin(gstin?: string) {
    if (!gstin) return;
    const res = gstinSchema.safeParse(gstin);
    if (!res.success) {
      throw new BadRequestException(res.error.issues[0]?.message ?? 'Invalid GSTIN');
    }
  }

  private computeTotals(items: BillingLineInput[], isInterState: boolean) {
    let subtotalMinor = 0n;
    let discountMinor = 0n;
    let cgstMinor = 0n;
    let sgstMinor = 0n;
    let igstMinor = 0n;
    let taxMinor = 0n;
    let grandMinor = 0n;

    const computedItems: Omit<InvoiceItemRecord, 'id'>[] = items.map((item) => {
      const calc = calculateLineAmounts({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxRatePercent: item.taxRatePercent,
        isInterState,
      });

      subtotalMinor += parseDecimalToMinor(calc.taxableAmount);
      discountMinor += parseDecimalToMinor(calc.discountAmount);
      cgstMinor += parseDecimalToMinor(calc.cgstAmount);
      sgstMinor += parseDecimalToMinor(calc.sgstAmount);
      igstMinor += parseDecimalToMinor(calc.igstAmount);
      taxMinor += parseDecimalToMinor(calc.taxAmount);
      grandMinor += parseDecimalToMinor(calc.lineTotal);

      return {
        description: item.description,
        hsnSac: item.hsnSac ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: calc.discountAmount,
        taxRatePercent: item.taxRatePercent,
        taxAmount: calc.taxAmount,
        lineTotal: calc.lineTotal,
      };
    });

    return {
      computedItems,
      subtotal: formatMinorToDecimal(subtotalMinor),
      discountTotal: formatMinorToDecimal(discountMinor),
      cgstTotal: formatMinorToDecimal(cgstMinor),
      sgstTotal: formatMinorToDecimal(sgstMinor),
      igstTotal: formatMinorToDecimal(igstMinor),
      taxTotal: formatMinorToDecimal(taxMinor),
      grandTotal: formatMinorToDecimal(grandMinor),
    };
  }
}
