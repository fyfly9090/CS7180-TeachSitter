// Display formatting utilities.

/**
 * Derive a display name from an email address.
 * e.g. "patricia.johnson@example.com" → "Patricia Johnson"
 * Falls back to the local part or "Parent" if parsing fails.
 */
export function emailToDisplayName(email: string): string {
  const local = email.split("@")[0];
  if (!local) return "Parent";
  const parts = local.split(/[._-]/);
  const name = parts
    .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
    .filter(Boolean)
    .join(" ");
  return name || "Parent";
}

/**
 * Format a YYYY-MM-DD date range for display.
 * e.g. ("2026-06-16", "2026-06-20") → "Jun 16 – Jun 20, 2026"
 */
export function formatDateRange(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const fmtYear = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  if (start === end) return fmtYear.format(s);
  return `${fmt.format(s)} – ${fmtYear.format(e)}`;
}
