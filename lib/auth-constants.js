/**
 * Centralized cookie key names for auth tokens.
 * Used by session and middleware logic to keep token storage consistent.
 */
export const TENANT_TOKEN_KEY =
  process.env.NEXT_PUBLIC_TENANT_TOKEN_KEY || "tenant_token";

export const CENTRAL_TOKEN_KEY =
  process.env.NEXT_PUBLIC_CENTRAL_TOKEN_KEY || "central_token";

