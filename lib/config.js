/**
 * Frontend runtime configuration and API URL builders.
 * Used to keep central/tenant endpoints consistent across environments.
 *
 * Prefer NEXT_PUBLIC_* when set (Docker / staging). Production images build
 * with NODE_ENV=production, so those env URLs must not be ignored.
 */
export const config = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8000"
      : "https://binbothub.com/backend"),

  CENTRAL_API_URL:
    process.env.NEXT_PUBLIC_CENTRAL_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://app.localhost:8000/api"
      : "https://binbothub.com/backend/api"),

  CENTRAL_DOMAIN:
    process.env.NEXT_PUBLIC_CENTRAL_DOMAIN ||
    (process.env.NODE_ENV === "development" ? "app.localhost" : "binbothub.com"),

  CENTRAL_API_PORT: process.env.NEXT_PUBLIC_CENTRAL_API_PORT || "8000",

  TENANT_API_PORT: process.env.NEXT_PUBLIC_TENANT_API_PORT || "8000",

  TENANT_ROOT_DOMAIN:
    process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ||
    (process.env.NODE_ENV === "development" ? "localhost" : "binbothub.com"),

  NODE_ENV: process.env.NODE_ENV || "production",

  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
};

export function getApiUrl(endpoint = "") {
  const clean = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${config.API_BASE_URL.replace(/\/$/, "")}/${clean}`;
}

export function getCentralApiUrl(endpoint = "") {
  const clean = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  // Prefer explicit NEXT_PUBLIC_CENTRAL_API_URL (Docker / local compose bake this in).
  if (process.env.NEXT_PUBLIC_CENTRAL_API_URL) {
    const base = config.CENTRAL_API_URL.replace(/\/$/, "");
    return clean ? `${base}/${clean}` : `${base}/`;
  }
  if (config.isDevelopment) {
    return `http://${config.CENTRAL_DOMAIN}:${config.CENTRAL_API_PORT}/api/${clean}`;
  }
  return `https://${config.CENTRAL_DOMAIN}/backend/api/${clean}`;
}

export function getTenantApiUrl(tenantName, endpoint = "") {
  const clean = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  // Local/Docker: use http://{tenant}.{root}:{port}/ when ports or API URL are configured.
  const useLocalTenantHost =
    config.isDevelopment ||
    Boolean(process.env.NEXT_PUBLIC_TENANT_API_PORT) ||
    Boolean(process.env.NEXT_PUBLIC_API_URL);

  if (useLocalTenantHost) {
    return `http://${tenantName}.${config.TENANT_ROOT_DOMAIN}:${config.TENANT_API_PORT}/${clean}`;
  }
  return `https://${tenantName}.${config.CENTRAL_DOMAIN}/backend/${clean}`;
}

export default config;
