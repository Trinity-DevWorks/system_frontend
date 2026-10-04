/**
 * Central API base for server-side fetches (proxy, layouts).
 *
 * Central API is registered on Laravel `Route::domain(central_domains)`, so the request URL host
 * must be that domain (e.g. http://app.localhost:8000/api); a `Host` header override is not honored.
 */
export function getServerCentralApiBase() {
  const explicitBase = process.env.NEXT_PUBLIC_CENTRAL_API_BASE;
  if (explicitBase && explicitBase.trim().length > 0) {
    return explicitBase.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    const port = process.env.NEXT_PUBLIC_CENTRAL_API_PORT || "8000";
    const domain = process.env.NEXT_PUBLIC_CENTRAL_DOMAIN || "app.localhost";
    return `http://${domain}:${port}/api`;
  }

  return "http://backend:8000/api";
}
