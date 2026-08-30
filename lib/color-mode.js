export const COLOR_MODE_STORAGE_KEY = "app-color-mode";
export const COLOR_MODE_COOKIE = "app_color_mode";
export const COLOR_MODE_RESOLVED_COOKIE = "app_color_resolved";

export const COLOR_MODE_SYSTEM = "system";
export const COLOR_MODE_LIGHT = "light";
export const COLOR_MODE_DARK = "dark";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

/**
 * @param {string | null | undefined} raw
 * @returns {"system" | "light" | "dark"}
 */
export function parseColorMode(raw) {
  if (raw === COLOR_MODE_DARK || raw === COLOR_MODE_LIGHT || raw === COLOR_MODE_SYSTEM) {
    return raw;
  }
  return COLOR_MODE_SYSTEM;
}

/**
 * @param {string | null | undefined} raw
 * @returns {"light" | "dark"}
 */
export function parseResolvedColorMode(raw) {
  return raw === COLOR_MODE_DARK ? COLOR_MODE_DARK : COLOR_MODE_LIGHT;
}

/**
 * @param {{ get: (name: string) => { value?: string } | undefined }} jar
 * @returns {"system" | "light" | "dark"}
 */
export function colorModeFromCookieStore(jar) {
  return parseColorMode(jar.get(COLOR_MODE_COOKIE)?.value);
}

/**
 * @param {{ get: (name: string) => { value?: string } | undefined }} jar
 * @returns {"light" | "dark"}
 */
export function resolvedColorModeFromCookieStore(jar) {
  const pref = colorModeFromCookieStore(jar);
  if (pref === COLOR_MODE_DARK || pref === COLOR_MODE_LIGHT) return pref;
  return parseResolvedColorMode(jar.get(COLOR_MODE_RESOLVED_COOKIE)?.value);
}

/** @returns {"system" | "light" | "dark"} */
export function loadColorMode() {
  if (typeof window === "undefined") return COLOR_MODE_SYSTEM;
  try {
    return parseColorMode(localStorage.getItem(COLOR_MODE_STORAGE_KEY));
  } catch {
    return COLOR_MODE_SYSTEM;
  }
}

/** @param {string} name @param {string} value */
function writeCookie(name, value) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

/**
 * @param {"system" | "light" | "dark"} mode
 * @param {"light" | "dark"} resolved
 */
export function saveColorMode(mode, resolved) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore quota */
  }
  writeCookie(COLOR_MODE_COOKIE, mode);
  writeCookie(COLOR_MODE_RESOLVED_COOKIE, resolved);
}

/**
 * Runs before paint so html.dark (and the next request's cookie) match localStorage
 * when the preference has not been sent to the server yet.
 */
export const COLOR_MODE_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(COLOR_MODE_STORAGE_KEY)};var mode="system";try{var stored=localStorage.getItem(k);if(stored==="dark"||stored==="light"||stored==="system")mode=stored;}catch(e){}var dark=mode==="dark"||(mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";var resolved=dark?"dark":"light";var age=${COOKIE_MAX_AGE_SEC};document.cookie="${COLOR_MODE_COOKIE}="+mode+"; Path=/; Max-Age="+age+"; SameSite=Lax";document.cookie="${COLOR_MODE_RESOLVED_COOKIE}="+resolved+"; Path=/; Max-Age="+age+"; SameSite=Lax";}catch(e){}})();`;
