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

const getCachedTenantStatus = (tenantName) => {
  const cached = tenantExistenceCache.get(tenantName);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > TENANT_CACHE_TTL_MS) {
    tenantExistenceCache.delete(tenantName);
    return null;
  }
  return cached.exists;
};

const setCachedTenantStatus = (tenantName, exists) => {
  if (
    !tenantExistenceCache.has(tenantName) &&
    tenantExistenceCache.size >= TENANT_CACHE_MAX
  ) {
    const oldestKey = tenantExistenceCache.keys().next().value;
    tenantExistenceCache.delete(oldestKey);
  }
  tenantExistenceCache.set(tenantName, { exists, timestamp: Date.now() });
};

const fetchTenantStatusOnce = async (tenantName, centralApiBase, centralDomain) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TENANT_LOOKUP_TIMEOUT_MS);
  const url = `${centralApiBase}/tenant/get-tenant-by-name/${encodeURIComponent(tenantName)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Host: centralDomain,
      },
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
      const payload = json?.data ?? json;
      exists = Boolean(
        payload?.tenant ||
        json?.tenant ||
        (typeof json?.message === "string" &&
          /Tenant\s+found/i.test(json.message)),
      );
    } catch {
      // assume exists on parse failure
    }

    return exists;
  } finally {
    clearTimeout(timeoutId);
  }
};

const resolveTenantExistence = async (tenantName, centralApiBase, centralDomain) => {
  if (!tenantName) return null;

  const cached = getCachedTenantStatus(tenantName);
  if (cached !== null) {
    return cached;
  }

  let delay = INITIAL_RETRY_DELAY_MS;
  for (let attempt = 0; attempt <= MAX_TENANT_LOOKUP_RETRIES; attempt++) {
    try {
      const exists = await fetchTenantStatusOnce(
        tenantName,
        centralApiBase,
        centralDomain,
      );
      setCachedTenantStatus(tenantName, exists);
      return exists;
    } catch {
      if (attempt === MAX_TENANT_LOOKUP_RETRIES) {
        break;
      }
      await sleep(delay);
      delay *= 2;
    }
  }

  return null;
};

export default async function middleware(request) {
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
  const CENTRAL_DOMAIN =
    process.env.NEXT_PUBLIC_CENTRAL_DOMAIN ||
    (isDevelopment ? "app.localhost" : "binbothub.com");
  const API_PORT = process.env.NEXT_PUBLIC_CENTRAL_API_PORT || "8000";
  const centralApiBase =
    EXPLICIT_BASE && EXPLICIT_BASE.trim().length > 0
      ? EXPLICIT_BASE.replace(/\/$/, "")
      : isDevelopment
        ? `http://localhost:${API_PORT}/api`
        : `http://backend:8000/api`;

  const hostMode = resolveHostMode(effectiveHost);
  const tenantFromHost = hostMode.tenantSlug;
  const isCentralHost = hostMode.isCentral;

  const isNetworkErrorPath =
    barePath === "/network-error" ||
    barePath.startsWith("/network-error/");
  const isNotFoundPath =
    barePath === "/notfound" || barePath.startsWith("/notfound/");
  const isLoginPath = barePath === "/login" || barePath.startsWith("/login/");
  const isCentralPath =
    barePath === "/central" || barePath.startsWith("/central/");

  if (isNetworkErrorPath) {
    return intlResponse;
  }

  let tenantLookupResult;
  if (tenantFromHost) {
    tenantLookupResult = await resolveTenantExistence(
      tenantFromHost,
      centralApiBase,
      CENTRAL_DOMAIN,
    );
  }

  if (isNotFoundPath) {
    if (tenantFromHost && tenantLookupResult === true) {
      const cleanedUrl = request.nextUrl.clone();
      cleanedUrl.pathname = withLocalePrefix(currentLocale, "/");
      return NextResponse.redirect(cleanedUrl);
    }
    if (tenantFromHost && tenantLookupResult === null) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/network-error");
      return NextResponse.redirect(url);
    }
    return intlResponse;
  }

  if (tenantFromHost) {
    if (tenantLookupResult === false) {
      const notFoundUrl = request.nextUrl.clone();
      notFoundUrl.pathname = withLocalePrefix(currentLocale, "/notfound");
      return NextResponse.redirect(notFoundUrl);
    }
    if (tenantLookupResult === null) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/network-error");
      return NextResponse.redirect(url);
    }
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
        url.pathname = withLocalePrefix(currentLocale, "/");
        return NextResponse.redirect(url);
      }
    } else if (hasCentralToken) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/central");
      return NextResponse.redirect(url);
    } else if (hasTenantToken) {
      const url = request.nextUrl.clone();
      url.pathname = withLocalePrefix(currentLocale, "/");
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

  if (isCentralPath) {
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

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
