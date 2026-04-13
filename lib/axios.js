import axios from "axios";
import { getCentralApiUrl, getTenantApiUrl } from "@/lib/config";
import { getApiErrorDisplay, isApiError, isApiSuccess } from "@/lib/api-envelope";
import { resolveHostMode } from "@/lib/runtime-mode";
import { clearSessionToken, getSessionToken } from "@/lib/session";

function maybeRedirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.includes("/login")) return;
  window.location.href = "/login";
}

function toApiError(message, details) {
  const error = new Error(message);
  error.details = details;
  return error;
}

function normalizeApiPayload(payload) {
  if (isApiSuccess(payload)) {
    return payload.data ?? payload;
  }

  if (isApiError(payload)) {
    const { message, errors } = getApiErrorDisplay(payload);
    throw toApiError(message, errors);
  }

  return payload;
}

function createApiClient(mode) {
  const client = axios.create({
    timeout: 15000,
    withCredentials: true,
    headers: {
      Accept: "application/json",
    },
  });

  client.interceptors.request.use((config) => {
    const nextConfig = { ...config };
    const token = getSessionToken(mode);

    if (token) {
      nextConfig.headers = {
        ...nextConfig.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    if (!(nextConfig.data instanceof FormData)) {
      nextConfig.headers = {
        "Content-Type": "application/json",
        ...nextConfig.headers,
      };
    }

    if (mode === "central") {
      nextConfig.baseURL = getCentralApiUrl("");
    } else {
      const hostname =
        typeof window !== "undefined" ? window.location.hostname : "";
      const { tenantSlug } = resolveHostMode(hostname);
      if (!tenantSlug) {
        throw toApiError("Tenant hostname is required for tenant requests.");
      }
      nextConfig.baseURL = getTenantApiUrl(tenantSlug, "");
    }

    return nextConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        clearSessionToken(mode);
        maybeRedirectToLogin();
      }

      const body = error?.response?.data;
      if (body && typeof body === "object") {
        try {
          const normalized = normalizeApiPayload(body);
          throw toApiError("Request failed", normalized);
        } catch (normalizedError) {
          return Promise.reject(normalizedError);
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

async function request(client, method, endpoint, data, config = {}) {
  const response = await client.request({
    method,
    url: endpoint,
    data,
    ...config,
  });

  return normalizeApiPayload(response.data);
}

export const centralApiClient = createApiClient("central");
export const tenantApiClient = createApiClient("tenant");

export async function centralRequest(method, endpoint, data = null, config = {}) {
  return request(centralApiClient, method, endpoint, data, config);
}

export async function tenantRequest(method, endpoint, data = null, config = {}) {
  return request(tenantApiClient, method, endpoint, data, config);
}
