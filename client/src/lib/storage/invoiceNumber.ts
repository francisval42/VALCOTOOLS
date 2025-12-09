const KEY = "valco_invoice_last_number";
const DEFAULT_START = "2025-04564";

export function getNextInvoiceNumber(): string {
  try {
    const last = localStorage.getItem(KEY);
    if (!last) return DEFAULT_START;
    
    // Parse format YYYY-XXXXX
    const match = last.match(/^(\d{4})-(\d+)$/);
    if (!match) return DEFAULT_START;
    
    const year = match[1];
    const numStr = match[2];
    const num = parseInt(numStr, 10);
    
    if (isNaN(num)) return DEFAULT_START;
    
    const nextNum = num + 1;
    // Preserve padding length
    const padded = nextNum.toString().padStart(numStr.length, '0');
    
    return `${year}-${padded}`;
  } catch (e) {
    console.error("Error generating next invoice number", e);
    return DEFAULT_START;
  }
}

export function commitInvoiceNumber(invoiceNumber: string): void {
  localStorage.setItem(KEY, invoiceNumber);
}
