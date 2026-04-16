/**
 * Hostname-to-runtime resolver for central vs tenant mode.
 * Used as the single source of truth for tenant slug and host context.
 */
function normalizeHost(hostname) {
  return (hostname || "").toLowerCase().split(":")[0].trim();
}

/** Align with backend `TenantController::RESERVED_TENANT_SLUGS` — never treat as tenant workspace. */
const RESERVED_SUBDOMAIN_LABELS = new Set([
  "app",
  "www",
  "api",
  "admin",
  "mail",
  "ftp",
  "cdn",
  "static",
]);

function getModeConfig() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const centralDomain =
    process.env.NEXT_PUBLIC_CENTRAL_DOMAIN ||
    (isDevelopment ? "app.localhost" : "binbothub.com");
  const tenantRootDomain =
    process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN || "binbothub.com";

  return {
    isDevelopment,
    centralDomain: centralDomain.toLowerCase(),
    tenantRootDomain: tenantRootDomain.toLowerCase(),
  };
}

function resolveTenantSlug(host, cfg) {
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  if (host === cfg.centralDomain || host === `www.${cfg.centralDomain}`) {
    return null;
  }

  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    if (!sub || RESERVED_SUBDOMAIN_LABELS.has(sub)) return null;
    return sub;
  }

  if (host.endsWith(`.${cfg.tenantRootDomain}`)) {
    const sub = host.slice(0, -`.${cfg.tenantRootDomain}`.length);
    if (!sub || RESERVED_SUBDOMAIN_LABELS.has(sub)) return null;
    return sub;
  }

  return null;
}

/**
 * Single source of truth for host mode resolution.
 * Returns central/tenant identity for middleware and client code.
 */
export function resolveHostMode(hostname) {
  const cfg = getModeConfig();
  const host = normalizeHost(hostname);
  const tenantSlug = resolveTenantSlug(host, cfg);
  const isCentral =
    !tenantSlug ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === cfg.centralDomain ||
    host === `www.${cfg.centralDomain}` ||
    host === cfg.tenantRootDomain ||
    host === `www.${cfg.tenantRootDomain}`;

  return {
    host,
    isCentral,
    tenantSlug,
    centralDomain: cfg.centralDomain,
    tenantRootDomain: cfg.tenantRootDomain,
    isDevelopment: cfg.isDevelopment,
  };
}
