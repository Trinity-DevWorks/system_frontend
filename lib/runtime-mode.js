function normalizeHost(hostname) {
  return (hostname || "").toLowerCase().split(":")[0].trim();
}

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
    if (!sub || sub === "app") return null;
    return sub;
  }

  if (host.endsWith(`.${cfg.tenantRootDomain}`)) {
    const sub = host.slice(0, -`.${cfg.tenantRootDomain}`.length);
    if (!sub || sub === "www" || sub === "app") return null;
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
    host === "binbothub.com" ||
    host === "www.binbothub.com";

  return {
    host,
    isCentral,
    tenantSlug,
    centralDomain: cfg.centralDomain,
    tenantRootDomain: cfg.tenantRootDomain,
    isDevelopment: cfg.isDevelopment,
  };
}
