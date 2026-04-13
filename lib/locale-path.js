import { routing } from "../i18n/routing";

export function getLocaleFromPathname(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && routing.locales.includes(segments[0])) {
    return segments[0];
  }
  return routing.defaultLocale;
}

/** Path with optional leading locale segment removed (e.g. `/ar/login` → `/login`). */
export function pathnameWithoutLocalePrefix(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && routing.locales.includes(segments[0])) {
    const rest = segments.slice(1);
    return rest.length ? `/${rest.join("/")}` : "/";
  }
  if (!pathname || pathname === "/") return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

/** Build pathname for redirects (respects `localePrefix: as-needed`). */
export function withLocalePrefix(locale, path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return p;
  }
  return `/${locale}${p}`;
}
