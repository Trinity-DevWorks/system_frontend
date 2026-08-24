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
 * @param {{
 *   actionPath: string | null | undefined,
 *   pathname: string,
 *   search?: string,
 *   router: { push: (href: string) => void },
 * }} args
 */
export function navigateNotificationActionPath({
  actionPath,
  pathname,
  search = "",
  router,
}) {
  if (!actionPath || typeof actionPath !== "string") return;
  const { href } = parseActionPath(actionPath);
  if (!href) return;

  const currentSearch = search.startsWith("?") ? search : search ? `?${search}` : "";
  const currentHref = `${pathname}${currentSearch}`;
  if (href === currentHref) return;

  router.push(href);
}
