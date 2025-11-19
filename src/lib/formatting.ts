import type { Camping } from "@/lib/types";

export function formatCurrency(value?: number): string {
  return typeof value === "number" ? `$${value.toFixed(0)}` : "—";
}

export function formatPhone(phone?: string): string {
  if (!phone) return "";

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as XXX-XXX-XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as X-XXX-XXX-XXXX for 11 digits (with country code)
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if not a standard format
  return phone;
}

export function formatCamping(camping: Camping): string {
  const campingLabels: Record<Camping, string> = {
    tent: "Tent",
    rv30A: "RV 30A",
    rv50A: "RV 50A",
    fullHookup: "Full Hookup",
    cabin: "Cabin",
    groupSite: "Group Site",
    backcountry: "Backcountry / Walk-in",
  };
  return campingLabels[camping];
}
