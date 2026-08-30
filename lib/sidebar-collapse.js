import { getLocalPreferenceUserId } from "@/lib/local-preference-scope";

const STORAGE_PREFIX = "shell.sidebar.collapsed";
const LEGACY_STORAGE_KEY = "shell.sidebar.collapsed";

/** Readable on the server so the first HTML can match the saved rail state. */
export const SIDEBAR_COLLAPSED_COOKIE = "shell_sidebar_collapsed";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

function storageKey() {
  return `${STORAGE_PREFIX}:${getLocalPreferenceUserId()}`;
}

/**
 * @param {string | null} raw
 * @returns {boolean | null}
 */
function parseCollapsed(raw) {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return null;
}

/** @returns {boolean} */
export function loadSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    const scoped = parseCollapsed(localStorage.getItem(storageKey()));
    if (scoped != null) return scoped;
    const legacy = parseCollapsed(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy == null) return false;
    if (getLocalPreferenceUserId() !== "anon") {
      saveSidebarCollapsed(legacy);
    }
    return legacy;
  } catch {
    return false;
  }
}

/** @param {boolean} collapsed */
function writeCollapsedCookie(collapsed) {
  if (typeof document === "undefined") return;
  const value = collapsed ? "1" : "0";
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

/** @param {boolean} collapsed */
export function applyDocumentSidebarCollapsed(collapsed) {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute("data-shell-sidebar-collapsed", collapsed);
}

/** @param {boolean} collapsed */
export function saveSidebarCollapsed(collapsed) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(), collapsed ? "1" : "0");
  } catch {
    /* ignore quota */
  }
  writeCollapsedCookie(collapsed);
  applyDocumentSidebarCollapsed(collapsed);
}

/**
 * Runs before paint so a collapsed rail does not flash open when the cookie
 * is missing (first load after the preference existed only in localStorage).
 */
export const SIDEBAR_COLLAPSE_BOOT_SCRIPT = `(function(){try{var p=${JSON.stringify(STORAGE_PREFIX)};var uid="";try{uid=localStorage.getItem("tenant.local-prefs.user-id")||"";}catch(e){}var raw=null;try{if(uid)raw=localStorage.getItem(p+":"+uid);if(raw==null)raw=localStorage.getItem(p);}catch(e){}if(raw==="1"||raw==="true"){document.documentElement.setAttribute("data-shell-sidebar-collapsed","");document.cookie="${SIDEBAR_COLLAPSED_COOKIE}=1; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax";}}catch(e){}})();`;
