import { InvoiceLineItem, TaxInvoiceMode } from "./types";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateTotals(
  items: InvoiceLineItem[],
  mode: TaxInvoiceMode
): { subtotalExGst: number; gstTotal: number; totalIncGst: number } {
  let subtotalEx = 0;
  let gst = 0;
  let totalInc = 0;

  for (const item of items) {
    const inc = Number.isFinite(item.amountIncGst) ? item.amountIncGst : 0;
    if (mode === "GST_INC") {
      const ex = inc / 1.1;
      const lineGst = inc - ex;
      subtotalEx += ex;
      gst += lineGst;
      totalInc += inc;
    } else {
      // NO_GST mode
      subtotalEx += inc;
      totalInc += inc;
    }
  }

  subtotalEx = round2(subtotalEx);
  gst = round2(gst);
  totalInc = round2(totalInc);

  return { subtotalExGst: subtotalEx, gstTotal: gst, totalIncGst: totalInc };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
