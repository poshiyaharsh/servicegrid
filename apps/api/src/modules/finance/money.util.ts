/**
 * Exact BigInt minor-unit (2 decimal places) monetary arithmetic.
 * Never uses IEEE-754 floating-point arithmetic for financial calculations.
 */

const DECIMAL_RE = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

export function parseDecimalToMinor(value: string): bigint {
  const trimmed = value.trim();
  const match = DECIMAL_RE.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid decimal money string: "${value}"`);
  }
  const negative = Boolean(match[1]);
  const whole = BigInt(match[2]!);
  const fracRaw = (match[3] ?? '').padEnd(2, '0');
  const frac = BigInt(fracRaw);
  const minor = whole * 100n + frac;
  return negative ? -minor : minor;
}

export function formatMinorToDecimal(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export function addDecimals(a: string, b: string): string {
  return formatMinorToDecimal(parseDecimalToMinor(a) + parseDecimalToMinor(b));
}

export function subtractDecimals(a: string, b: string): string {
  return formatMinorToDecimal(parseDecimalToMinor(a) - parseDecimalToMinor(b));
}

export function calculateLineAmounts(input: {
  quantity: string;
  unitPrice: string;
  discountAmount?: string;
  taxRatePercent: string;
  isInterState: boolean;
}) {
  const qtyMinor = parseDecimalToMinor(input.quantity);
  const priceMinor = parseDecimalToMinor(input.unitPrice);
  const discountMinor = parseDecimalToMinor(input.discountAmount ?? '0');
  const taxBps = parseDecimalToMinor(input.taxRatePercent); // e.g., 18.00% -> 1800

  // (qtyMinor * priceMinor) / 100 gives minor units; round half-up
  const grossMinor = (qtyMinor * priceMinor + 50n) / 100n;
  const taxableMinor = grossMinor > discountMinor ? grossMinor - discountMinor : 0n;

  // tax = taxableMinor * taxBps / 10000 (since 100% = 10000 in 2-decimal bps)
  const taxMinor = (taxableMinor * taxBps + 5000n) / 10000n;

  let cgstMinor = 0n;
  let sgstMinor = 0n;
  let igstMinor = 0n;
  if (input.isInterState) {
    igstMinor = taxMinor;
  } else {
    cgstMinor = taxMinor / 2n;
    sgstMinor = taxMinor - cgstMinor;
  }

  const lineTotalMinor = taxableMinor + taxMinor;

  return {
    taxableAmount: formatMinorToDecimal(taxableMinor),
    discountAmount: formatMinorToDecimal(discountMinor),
    cgstAmount: formatMinorToDecimal(cgstMinor),
    sgstAmount: formatMinorToDecimal(sgstMinor),
    igstAmount: formatMinorToDecimal(igstMinor),
    taxAmount: formatMinorToDecimal(taxMinor),
    lineTotal: formatMinorToDecimal(lineTotalMinor),
  };
}

export function getFinancialYearLabel(date = new Date(), fiscalStartMonth = 4): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= fiscalStartMonth ? year : year - 1;
  const endShort = ((startYear + 1) % 100).toString().padStart(2, '0');
  return `FY${startYear}-${endShort}`;
}

export function formatCurrencyDisplay(amount: string, currency = 'INR'): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const [wholePart = '0', fracPart = '00'] = amount.split('.');
  const formattedWhole = new Intl.NumberFormat(locale).format(BigInt(wholePart));
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${formattedWhole}.${fracPart.padEnd(2, '0')}`;
}
