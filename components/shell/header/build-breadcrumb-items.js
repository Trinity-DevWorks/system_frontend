import { findNavLabelForPath, ROUTES } from "../sidebar/main-nav";

/**
 * Turn "foo-bar" / "foo_bar" into "Foo bar" for unknown path segments.
 * @param {string} slug
 */
export function humanizePathSegment(slug) {
  if (!slug) return "";
  const words = slug.replace(/[-_]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return slug;
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Build breadcrumb entries for the main app shell (paths under /main/...).
 *
 * @param {string} pathname Locale-agnostic pathname from next-intl (e.g. /main/overview).
 * @param {import("antd").MenuProps["items"]} menuItems Same items as the sidebar (for labels).
 * @param {(key: string) => string} t Shell translator.
 * @returns {{ key: string, title: string, href?: string }[]}
 */
export function buildBreadcrumbEntries(pathname, menuItems, t) {
  if (!pathname.startsWith("/main")) {
    return [{ key: pathname, title: pathname }];
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "main") {
    return [{ key: pathname, title: pathname }];
  }

  const rest = parts.slice(1);
  if (rest.length === 0) {
    return [{ key: ROUTES.overview, title: t("breadcrumbRoot") }];
  }

  if (pathname === ROUTES.overview) {
    return [{ key: ROUTES.overview, title: t("navOverview") }];
  }

  /** @type {{ key: string, title: string, href?: string }[]} */
  const crumbs = [];

  for (let i = 0; i < rest.length; i++) {
    const path = `/main/${rest.slice(0, i + 1).join("/")}`;
    const segment = rest[i];
    const label =
      findNavLabelForPath(menuItems, path) || humanizePathSegment(segment);
    const isLast = i === rest.length - 1;
    crumbs.push({
      key: path,
      title: label,
      ...(isLast ? {} : { href: path }),
    });
  }

  if (rest[0] !== "overview") {
    crumbs.unshift({
      key: ROUTES.overview,
      title: t("breadcrumbRoot"),
      href: ROUTES.overview,
    });
  }

  return crumbs;
}
