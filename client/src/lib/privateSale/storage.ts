import { PrivateSaleInvoice } from "./types";

const KEY = "valco_private_sale_invoices_v1";

export function getPrivateSaleInvoices(): PrivateSaleInvoice[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse private sale invoices", e);
    return [];
  }
}

export function addPrivateSaleInvoice(inv: PrivateSaleInvoice): PrivateSaleInvoice[] {
  const current = getPrivateSaleInvoices();
  // Remove existing if present (to move to top)
  const filtered = current.filter((i) => i.id !== inv.id);
  
  // Prepend new
  const updated = [inv, ...filtered].slice(0, 5);
  
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save private sale invoices", e);
  }
  
  return updated;
}

export function clearPrivateSaleInvoices(): void {
  localStorage.removeItem(KEY);
}
