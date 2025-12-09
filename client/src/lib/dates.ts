import { format, addDays as dateFnsAddDays, parseISO } from "date-fns";

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDays(dateIso: string, days: number): string {
  try {
    const date = parseISO(dateIso);
    return format(dateFnsAddDays(date, days), "yyyy-MM-dd");
  } catch (e) {
    return dateIso;
  }
}

export function formatDisplay(dateIso: string): string {
  try {
    if (!dateIso) return "";
    return format(parseISO(dateIso), "dd/MM/yyyy");
  } catch (e) {
    return dateIso;
  }
}
