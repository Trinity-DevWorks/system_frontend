/** @param {string} h */
export function normalizeHexColor(h) {
  const s = String(h ?? "").trim();
  if (!s) return "";
  const u = s.toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(u)) {
    const r = u[1];
    const g = u[2];
    const b = u[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return u;
}
