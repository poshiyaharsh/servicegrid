import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinanceService } from '../src/modules/finance/finance.service';
import { InMemoryFinanceStore } from '../src/modules/finance/in-memory-finance.store';
import {
  addDecimals,
  formatCurrencyDisplay,
  getFinancialYearLabel,
} from '../src/modules/finance/money.util';

describe('Phase 10 — Billing, GST, Decimal Math & Immutability', () => {
  it('performs exact BigInt decimal math, GST split, and Indian currency formatting', () => {
    assert.equal(addDecimals('0.10', '0.20'), '0.30');
    assert.equal(formatCurrencyDisplay('123456.78', 'INR'), '₹1,23,456.78');
    assert.equal(getFinancialYearLabel(new Date('2026-11-26T00:00:00Z'), 4), 'FY2026-27');
    assert.equal(getFinancialYearLabel(new Date('2026-02-15T00:00:00Z'), 4), 'FY2025-26');
  });

  it('enforces finalized invoice immutability, supports credit/debit notes, payments, UPI sandbox, and isolation', async () => {
    const store = new InMemoryFinanceStore();
    const finance = new FinanceService(store);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';
    const userA = '22222222-2222-4222-8222-222222222222';
    const custA = '33333333-3333-4333-8333-333333333333';

    const est = await finance.createEstimate(tenantA, userA, {
      customerId: custA,
      items: [
        {
          description: 'AC Compressor Replacement',
          hsnSac: '8415',
          quantity: '1.00',
          unitPrice: '5000.00',
          discountAmount: '500.00',
          taxRatePercent: '18.00',
        },
      ],
    });
    assert.equal(est.subtotal, '4500.00');
    assert.equal(est.taxTotal, '810.00');
    assert.equal(est.grandTotal, '5310.00');

    await finance.approveEstimate(tenantA, est.id, userA);

    const inv = await finance.convertEstimateToInvoice(tenantA, est.id, userA, {
      businessGstin: '27AABCU9603R1ZM',
      isInterState: false,
    });
    assert.equal(inv.cgstTotal, '405.00');
    assert.equal(inv.sgstTotal, '405.00');
    assert.equal(inv.igstTotal, '0.00');
    assert.equal(inv.status, 'DRAFT');

    // Finalize invoice
    const finalized = await finance.finalizeInvoice(tenantA, inv.id, userA);
    assert.equal(finalized?.status, 'FINALIZED');

    // Silent modification of finalized invoice must be rejected
    await assert.rejects(
      () => finance.updateDraftInvoice(tenantA, inv.id, userA, { customerGstin: '27AABCU9603R1ZM' }),
      BadRequestException,
    );

    // Issue credit note (-310.00) -> balanceDue = 5000.00
    await finance.issueCreditNote(tenantA, inv.id, userA, {
      amount: '310.00',
      reason: 'Goodwill discount',
    });
    assert.equal((await finance.getInvoice(tenantA, inv.id)).balanceDue, '5000.00');

    // Sandbox UPI intent
    const upi = await finance.createSandboxUpiIntent(tenantA, inv.id);
    assert.equal(upi.mode, 'SANDBOX');
    assert.ok(upi.upiUri.startsWith('upi://pay?'));

    // Partial payment (2000.00) -> PARTIALLY_PAID
    const pay1 = await finance.recordPayment(tenantA, userA, {
      invoiceId: inv.id,
      amount: '2000.00',
      method: 'UPI',
      reference: 'UTR123456',
    });
    assert.equal((await finance.getInvoice(tenantA, inv.id)).status, 'PARTIALLY_PAID');

    // Reconcile & refund test on pay1
    const reconciled = await finance.reconcilePayment(tenantA, pay1.id, userA);
    assert.equal(reconciled.status, 'RECONCILED');

    // Remaining payment (3000.00) -> PAID
    await finance.recordPayment(tenantA, userA, {
      invoiceId: inv.id,
      amount: '3000.00',
      method: 'BANK_TRANSFER',
    });
    const paidInv = await finance.getInvoice(tenantA, inv.id);
    assert.equal(paidInv.status, 'PAID');
    assert.equal(paidInv.balanceDue, '0.00');

    // Expenses & Commissions
    await finance.createExpense(tenantA, { category: 'TRAVEL', amount: '250.50' });
    await finance.createCommission(tenantA, { workOrderId: 'wo-1', technicianId: 'tech-1', amount: '400.00' });

    const audits = await finance.listAuditLogs(tenantA);
    assert.ok(audits.length >= 5);

    // Cross-tenant isolation
    await assert.rejects(() => finance.getInvoice(tenantB, inv.id), NotFoundException);
  });
});
