/**
 * Notification action-path navigation helpers.
 *
 * What: Compares full href (path + query) so deep links like ?drawer=&mode= open even on the same list page.
 * Used for: NotificationBell and the notifications inbox.
 * Solves: usePathname() ignores search params, so same-route deep links used to no-op.
 */

/**
 * @param {string} actionPath
 * @returns {{ pathname: string, href: string }}
 */
export function parseActionPath(actionPath) {
  const raw = String(actionPath || "").trim();
  if (!raw) return { pathname: "", href: "" };
  const href = raw.startsWith("/") ? raw : `/${raw}`;
  const q = href.indexOf("?");
  return {
    pathname: q === -1 ? href : href.slice(0, q),
    href,
  };
}

/**
 * Older purchase-invoice notifications stored only the list path, with the
 * invoice id on resource_id. Open that drawer anyway.
 *
 * @param {string} href
 * @param {string | null | undefined} resourceType
 * @param {string | null | undefined} resourceId
 * @returns {string}
 */
export function withPurchaseInvoiceDrawer(href, resourceType, resourceId) {
  const parsed = parseActionPath(href);
  if (parsed.pathname !== "/main/purchase-invoices") return parsed.href;
  if (parsed.href.includes("drawer=")) return parsed.href;
  if (resourceType !== "purchase_invoice") return parsed.href;
  const id = resourceId == null ? "" : String(resourceId).trim();
  if (!id) return parsed.href;
  return `${parsed.pathname}?drawer=${encodeURIComponent(id)}&mode=edit`;
}

/**
 * @param {{
 *   actionPath: string | null | undefined,
 *   resourceType?: string | null,
 *   resourceId?: string | null,
 *   pathname: string,
 *   search?: string,
 *   router: { push: (href: string) => void },
 * }} args
 */
export function navigateNotificationActionPath({
  actionPath,
  resourceType = null,
  resourceId = null,
  pathname,
  search = "",
  router,
}) {
  if (!actionPath || typeof actionPath !== "string") return;
  const href = withPurchaseInvoiceDrawer(parseActionPath(actionPath).href, resourceType, resourceId);
  if (!href) return;

  const currentSearch = search.startsWith("?") ? search : search ? `?${search}` : "";
  const currentHref = `${pathname}${currentSearch}`;
  if (href === currentHref) return;

  router.push(href);
}
