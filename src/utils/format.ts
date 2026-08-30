/** Indian-locale formatting helpers used across dashboards, cards and tables. */

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact crore / lakh formatting, e.g. ₹4.85 Cr or ₹12.4 L */
export function formatCompactINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return formatINR(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatSqFt(value: number): string {
  return `${formatNumber(value)} sq ft`;
}

export function formatDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  };
  return date.toLocaleDateString("en-IN", options);
}

export function formatAcres(acres: number): string {
  return `${acres.toLocaleString("en-IN", { maximumFractionDigits: 2 })} acres`;
}

/** Prettify enum labels: AREA_DISCREPANCY -> Area Discrepancy */
export function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generate a mock sequential ticket number, e.g. DSP-2024-4821 */
export function generateTicketNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${serial}`;
}
