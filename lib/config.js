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
    process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN || "binbothub.com",

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
  if (config.isDevelopment) {
    return `http://${config.CENTRAL_DOMAIN}:${config.CENTRAL_API_PORT}/api/${clean}`;
  }
  return `https://${config.CENTRAL_DOMAIN}/backend/api/${clean}`;
}

export function getTenantApiUrl(tenantName, endpoint = "") {
  const clean = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  if (config.isDevelopment) {
    return `http://${tenantName}.${config.CENTRAL_DOMAIN}:${config.TENANT_API_PORT}/${clean}`;
  }
  return `https://${tenantName}.${config.CENTRAL_DOMAIN}/backend/${clean}`;
}

export default config;
