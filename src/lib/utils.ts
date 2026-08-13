import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function canViewPrices(role: string): boolean {
  return ["BROKER", "MANAGER", "ADMIN"].includes(role);
}

// "ID Traveller" tier. It reuses the existing (previously unused) BASIC role so
// that NO production database enum migration is required. An ID Traveller sees
// everything a broker sees EXCEPT real prices — instead a fixed per-person range
// ("on request") is shown. Because BASIC is not in canViewPrices(), real prices
// are already withheld automatically.
export const ID_TRAVELLER_ROLE = "BASIC";
export const ID_TRAVELLER_PRICE_MIN = 120;
export const ID_TRAVELLER_PRICE_MAX = 180;

export function isIdTraveller(role: string): boolean {
  return role === ID_TRAVELLER_ROLE;
}

export function canAccessAdmin(role: string): boolean {
  return ["MANAGER", "ADMIN"].includes(role);
}

export function isApproved(role: string): boolean {
  return role !== "PENDING";
}

const CABOTAGE_COUNTRY_GROUPS = [
  ["switzerland", "schweiz", "suisse"],
  ["united kingdom", "england", "uk", "great britain", "scotland", "wales", "northern ireland"],
];

export function isCabotageRestricted(depCountry: string, arrCountry: string): boolean {
  const dep = depCountry.toLowerCase().trim();
  const arr = arrCountry.toLowerCase().trim();
  return CABOTAGE_COUNTRY_GROUPS.some(
    (group) => group.some((c) => dep.includes(c)) && group.some((c) => arr.includes(c))
  );
}
