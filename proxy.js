import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import {
  getLocaleFromPathname,
  pathnameWithoutLocalePrefix,
  withLocalePrefix,
} from "./lib/locale-path";
import { CENTRAL_TOKEN_KEY, TENANT_TOKEN_KEY } from "./lib/auth-constants";
import { resolveHostMode } from "./lib/runtime-mode";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const tenantExistenceCache = new Map();
const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;
const TENANT_CACHE_MAX = 200;
const TENANT_LOOKUP_TIMEOUT_MS = 5000;
const MAX_TENANT_LOOKUP_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bump when lookup semantics change so stale `false` entries are not reused forever. */
const TENANT_CACHE_KEY_PREFIX = "v3:";

const getCachedTenantStatus = (tenantName) => {
  const cached = tenantExistenceCache.get(TENANT_CACHE_KEY_PREFIX + tenantName);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > TENANT_CACHE_TTL_MS) {
    tenantExistenceCache.delete(TENANT_CACHE_KEY_PREFIX + tenantName);
    return null;
  }
  return cached.exists;
};

const setCachedTenantStatus = (tenantName, exists) => {
  const key = TENANT_CACHE_KEY_PREFIX + tenantName;
  if (
    !tenantExistenceCache.has(key) &&
    tenantExistenceCache.size >= TENANT_CACHE_MAX
  ) {
    const oldestKey = tenantExistenceCache.keys().next().value;
    tenantExistenceCache.delete(oldestKey);
  }
  tenantExistenceCache.set(key, {
    exists,
    timestamp: Date.now(),
  });
};

/**
 * Same rules as inventory-management-frontend/middleware.js `fetchTenantStatusOnce`:
 * `Boolean(json && (json.tenant || /Tenant\s+found/i.test(json.message || "")))`
 * Plus `data.tenant` for ApiResponse envelopes before the flat `tenant` shim was added.
 */
function tenantExistsFromCentralJson(json) {
  if (!json || typeof json !== "object") {
    return false;
  }
  if (json.success === false) {
    return false;
  }
  const nested =
    json.data &&
    typeof json.data === "object" &&
    json.data.tenant != null;
  const flatMessage =
    typeof json.message === "string" &&
    /Tenant\s+found/i.test(json.message);
  return Boolean(
    json.tenant != null || nested || flatMessage,
  );
}

/**
 * Central API is registered on Laravel `Route::domain(central_domains)`.
 * Use a request URL whose host is that domain (e.g. http://app.localhost:8000/api).
 * Runtime evidence: fetch to http://localhost:8000/api with Host: app.localhost still got HTTP 404
 * (Host header not honored / overridden in this runtime), so domain routes never matched.
 */
const fetchTenantStatusOnce = async (tenantName, centralApiBase) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TENANT_LOOKUP_TIMEOUT_MS);
  const url = `${centralApiBase}/tenant/get-tenant-by-name/${encodeURIComponent(tenantName)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    if (res.status === 404) {
      return false;
    }

    if (!res.ok) {
      throw new Error(`Central lookup failed with status ${res.status}`);
    }

    let exists = true;
    try {
      const json = await res.json();
      exists = tenantExistsFromCentralJson(json);
    } catch {
      /* inventory: ignore parsing errors and assume tenant exists to avoid false negatives */
    }

    return exists;
  } finally {
    clearTimeout(timeoutId);
  }
};

const resolveTenantExistence = async (tenantName, centralApiBase) => {
  if (!tenantName) return null;

  const cached = getCachedTenantStatus(tenantName);
  if (cached !== null) {
    return cached;
  }

  const lookupUrl = `${centralApiBase}/tenant/get-tenant-by-name/${encodeURIComponent(tenantName)}`;
  let delay = INITIAL_RETRY_DELAY_MS;
  for (let attempt = 0; attempt <= MAX_TENANT_LOOKUP_RETRIES; attempt++) {
    try {
      const exists = await fetchTenantStatusOnce(tenantName, centralApiBase);
      setCachedTenantStatus(tenantName, exists);
      return exists;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[proxy] Tenant lookup failed (attempt ${attempt + 1}/${MAX_TENANT_LOOKUP_RETRIES + 1}): ${lookupUrl}`,
          err?.cause ?? err?.message ?? err,
        );
      }
      if (attempt === MAX_TENANT_LOOKUP_RETRIES) {
        break;
      }
      await sleep(delay);
      delay *= 2;
    }
  }

  /* Unknown (network, timeout): allow request to continue — same as inventory-management-frontend */
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[proxy] Tenant "${tenantName}" could not be verified; allowing request through.`,
    );
  }

  return null;
};

/** Next.js 16+: `proxy` replaces the deprecated `middleware` file convention. */
export default async function proxy(request) {
  const intlResponse = intlMiddleware(request);

  const { pathname } = request.nextUrl;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const effectiveHost = (
    forwardedHost ||
    request.nextUrl.hostname ||
    request.headers.get("host") ||
    ""
  ).split(":")[0];

  const currentLocale = getLocaleFromPathname(pathname);
  const barePath = pathnameWithoutLocalePrefix(pathname);

  const isDevelopment = process.env.NODE_ENV === "development";
  const EXPLICIT_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_BASE;
  const API_PORT = process.env.NEXT_PUBLIC_CENTRAL_API_PORT || "8000";
  const centralApiBase =
    EXPLICIT_BASE && EXPLICIT_BASE.trim().length > 0
      ? EXPLICIT_BASE.replace(/\/$/, "")
      : isDevelopment
        ? `http://localhost:${API_PORT}/api`
        : `http://backend:8000/api`;

  const hostMode = resolveHostMode(effectiveHost);
  /** Same reserved labels as `lib/runtime-mode.js` (e.g. `www.localhost` is central, not tenant `www`). */
  const tenantFromHost = hostMode.tenantSlug;
  const isCentralHost = hostMode.isCentral;

  const isNetworkErrorPath =
    barePath === "/network-error" ||
    barePath.startsWith("/network-error/");
  const isNotFoundPath =
    barePath === "/notfound" || barePath.startsWith("/notfound/");
  const isLoginPath = barePath === "/login" || barePath.startsWith("/login/");
  const isMainCentralPath =
    barePath === "/central" || barePath.startsWith("/central/");

  if (isNetworkErrorPath) {
    return intlResponse;
  }

  let tenantLookupResult;
  if (tenantFromHost) {
    tenantLookupResult = await resolveTenantExistence(
      tenantFromHost,
      centralApiBase,
    );
  }

  if (isNotFoundPath) {
    if (tenantFromHost && tenantLookupResult === true) {
      const cleanedUrl = request.nextUrl.clone();
      cleanedUrl.pathname = withLocalePrefix(currentLocale, "/");
      return NextResponse.redirect(cleanedUrl);
    }
    return intlResponse;
  }

  if (tenantFromHost) {
    if (tenantLookupResult === false) {
      const notFoundUrl = request.nextUrl.clone();
      notFoundUrl.pathname = withLocalePrefix(currentLocale, "/notfound");
      return NextResponse.redirect(notFoundUrl);
    }
    /* exists === null: lookup failed; continue (inventory behavior — no network-error redirect) */
  }

  const isTenantShellPath =
    barePath === "/main" || barePath.startsWith("/main/");

  /** Central hosts (e.g. `www.localhost`, `app.localhost`) must not load tenant shell routes. */
  if (isCentralHost && isTenantShellPath) {
    const hasCentralToken = request.cookies.get(CENTRAL_TOKEN_KEY)?.value;
    const url = request.nextUrl.clone();
    url.pathname = withLocalePrefix(
      currentLocale,
      hasCentralToken ? "/central" : "/login",
    );
    return NextResponse.redirect(url);
  }

  /** Tenant workspace hosts must not load central-only routes. */
  if (tenantFromHost && isMainCentralPath) {
    const hasTenantToken = request.cookies.get(TENANT_TOKEN_KEY)?.value;
    const url = request.nextUrl.clone();
    url.pathname = withLocalePrefix(
      currentLocale,
      hasTenantToken ? "/main/overview" : "/login",
    );
    return NextResponse.redirect(url);
  }

  if (isLoginPath) {
    const hasTenantToken = request.cookies.get(TENANT_TOKEN_KEY)?.value;
    const hasCentralToken = request.cookies.get(CENTRAL_TOKEN_KEY)?.value;

    if (isCentralHost) {
      if (hasCentralToken) {
        const url = request.nextUrl.clone();
        url.pathname = withLocalePrefix(currentLocale, "/central");
        return NextResponse.redirect(url);
      }
    } else if (tenantFromHost) {
      if (hasTenantToken) {
        const url = request.nextUrl.clone();
        url.pathname = withLocalePrefix(currentLocale, "/main/overview");
        return NextResponse.redirect(url);
      }
    } else if (hasCentralToken) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/central");
      return NextResponse.redirect(url);
    } else if (hasTenantToken) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/main/overview");
      return NextResponse.redirect(url);
    }

    return intlResponse;
  }

  const hasTenantToken = request.cookies.get(TENANT_TOKEN_KEY)?.value;
  const hasCentralToken = request.cookies.get(CENTRAL_TOKEN_KEY)?.value;

  const isCentralHome =
    isCentralHost &&
    Boolean(tenantFromHost) === false &&
    (barePath === "/" || barePath === "");
  const isPublicPath = isLoginPath || isNotFoundPath || isCentralHome;

  if (isMainCentralPath) {
    if (!hasCentralToken && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/login");
      return NextResponse.redirect(url);
    }
  } else if (tenantFromHost) {
    if (!hasTenantToken && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/login");
      return NextResponse.redirect(url);
    }
  } else if (!isPublicPath) {
    if (!hasCentralToken) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/login");
      return NextResponse.redirect(url);
    }
  }

  /** Tenant app root: send authenticated users to the shell home (overview), not the marketing placeholder. */
  if (
    tenantFromHost &&
    hasTenantToken &&
    (barePath === "/" || barePath === "")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = withLocalePrefix(currentLocale, "/main/overview");
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
