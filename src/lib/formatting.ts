export function formatCurrency(value?: number): string {
  return typeof value === "number" ? `$${value.toFixed(0)}` : "—";
}
