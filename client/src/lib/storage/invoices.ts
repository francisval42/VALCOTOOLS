import { TaxInvoice } from "../types";

const KEY = "valco_recent_invoices_v1";

export function getRecentInvoices(): TaxInvoice[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse recent invoices", e);
    return [];
  }
}

export function addRecentInvoice(inv: TaxInvoice): TaxInvoice[] {
  const current = getRecentInvoices();
  // Remove existing if present (to move to top)
  const filtered = current.filter((i) => i.id !== inv.id);
  
  // Prepend new
  const updated = [inv, ...filtered].slice(0, 5);
  
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recent invoices", e);
  }
  
  return updated;
}

export function clearRecentInvoices(): void {
  localStorage.removeItem(KEY);
}
