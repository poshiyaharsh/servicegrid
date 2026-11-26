export interface InvoiceLineItem {
  description: string;
  hsnSac?: string;
  quantity: string;
  unitPrice: string;
  taxRatePercent: string;
  lineTotal: string;
}

export interface BrandedInvoiceParams {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  businessName: string;
  businessGstin?: string;
  customerName: string;
  customerGstin?: string;
  currencySymbol?: string;
  items: InvoiceLineItem[];
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
}

export function renderBrandedInvoice(data: BrandedInvoiceParams): string {
  const symbol = data.currencySymbol ?? '₹';
  const rows = data.items
    .map(
      (item) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-family:monospace;">${item.hsnSac ?? '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;">${symbol}${item.unitPrice}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;">${item.taxRatePercent}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:600;">${symbol}${item.lineTotal}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Invoice ${data.invoiceNumber}</title></head>
<body style="font-family:Inter,Arial,sans-serif;color:#0F172A;margin:32px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F172A;padding-bottom:16px;">
    <div>
      <div style="font-size:20px;font-weight:700;">${data.businessName}</div>
      ${data.businessGstin ? `<div style="font-size:12px;color:#475569;">GSTIN: ${data.businessGstin}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;text-transform:uppercase;color:#0D9488;font-weight:700;">Tax Invoice</div>
      <div style="font-size:16px;font-weight:700;font-family:monospace;">${data.invoiceNumber}</div>
      <div style="font-size:12px;color:#64748B;">Issued: ${data.issueDate} | Due: ${data.dueDate}</div>
    </div>
  </div>
  <div style="margin:20px 0;font-size:13px;">
    <strong>Bill To:</strong> ${data.customerName}
    ${data.customerGstin ? `<br/>GSTIN: ${data.customerGstin}` : ''}
  </div>
  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;">
    <thead style="background:#F8FAFC;color:#475569;text-align:left;">
      <tr>
        <th style="padding:10px 12px;border-bottom:1px solid #CBD5E1;">Item</th>
        <th style="padding:10px 12px;border-bottom:1px solid #CBD5E1;">HSN/SAC</th>
        <th style="padding:10px 12px;border-bottom:1px solid #CBD5E1;text-align:right;">Qty</th>
        <th style="padding:10px 12px;border-bottom:1px solid #CBD5E1;text-align:right;">Rate</th>
        <th style="padding:10px 12px;border-bottom:1px solid #CBD5E1;text-align:right;">Tax</th>
        <th style="padding:10px 12px;border-bottom:1px solid #CBD5E1;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:20px;text-align:right;font-size:13px;">
    <div>Subtotal: ${symbol}${data.subtotal}</div>
    <div>Tax: ${symbol}${data.taxTotal}</div>
    <div style="font-size:16px;font-weight:700;margin-top:6px;color:#0F172A;">Total: ${symbol}${data.grandTotal}</div>
  </div>
  <div style="margin-top:32px;border-top:1px solid #E2E8F0;padding-top:12px;font-size:11px;color:#64748B;">
    Generated via FieldSutra
  </div>
</body>
</html>`;
}
