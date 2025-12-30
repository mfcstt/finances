import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date-only string (YYYY-MM-DD) as local midnight to avoid
 * timezone shifts when the string is interpreted as UTC by Date.
 */
export function parseDateOnlyLocal(dateStr?: string | null): Date | undefined {
  if (!dateStr) return undefined;
  // If the string already includes a time component, use the default Date parser
  if (dateStr.includes('T')) return new Date(dateStr);
  // Append local time so it's parsed as local midnight
  return new Date(dateStr + 'T00:00:00');
}
