import { SavedSupplier } from "../types";

const KEY = "valco_suppliers_v1";

export function getSuppliers(): SavedSupplier[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse suppliers", e);
    return [];
  }
}

export function saveSuppliers(list: SavedSupplier[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save suppliers", e);
  }
}

export function addOrUpdateSupplier(s: SavedSupplier): SavedSupplier[] {
  const current = getSuppliers();
  const index = current.findIndex((existing) => existing.id === s.id);
  
  if (index >= 0) {
    current[index] = s;
  } else {
    current.push(s);
  }
  
  saveSuppliers(current);
  return current;
}

export function deleteSupplier(id: string): SavedSupplier[] {
  const current = getSuppliers();
  const updated = current.filter((s) => s.id !== id);
  saveSuppliers(updated);
  return updated;
}
