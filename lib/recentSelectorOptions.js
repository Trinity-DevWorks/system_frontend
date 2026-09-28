import { getLocalPreferenceUserId } from "@/lib/local-preference-scope";

export const RECENT_SELECTOR_LIMIT = 20;

/**
 * @param {string} kind
 */
function storageKey(kind) {
  return `selector-recent:v1:${getLocalPreferenceUserId()}:${kind}`;
}

/**
 * @param {string} kind
 * @returns {{ value: unknown; label: string; [key: string]: unknown }[]}
 */
export function readRecentSelectorOptions(kind) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === "object" && row.value != null && row.value !== "")
      .slice(0, RECENT_SELECTOR_LIMIT)
      .map((row) => ({ ...row, label: String(row.label ?? row.value) }));
  } catch {
    return [];
  }
}

/**
 * @param {string} kind
 * @param {{ value: unknown; label?: string; [key: string]: unknown } | null | undefined} option
 */
export function rememberRecentSelectorOption(kind, option) {
  if (typeof window === "undefined" || !option || option.value == null || option.value === "") return;
  const next = {
    value: option.value,
    label: typeof option.label === "string" ? option.label : String(option.value),
  };
  for (const [key, value] of Object.entries(option)) {
    if (key === "value" || key === "label" || key === "options" || key === "className") continue;
    if (value == null) continue;
    if (["string", "number", "boolean"].includes(typeof value)) {
      next[key] = value;
    }
  }
  const key = String(next.value);
  const prev = readRecentSelectorOptions(kind).filter((row) => String(row.value) !== key);
  try {
    window.localStorage.setItem(
      storageKey(kind),
      JSON.stringify([next, ...prev].slice(0, RECENT_SELECTOR_LIMIT)),
    );
  } catch {
    /* quota */
  }
}

/**
 * @param {string} kind
 */
export function clearRecentSelectorOptions(kind) {
  if (typeof window === "undefined" || !kind) return;
  try {
    window.localStorage.removeItem(storageKey(kind));
  } catch {
    /* ignore */
  }
}
