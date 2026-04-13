import Cookies from "js-cookie";
import { CENTRAL_TOKEN_KEY, TENANT_TOKEN_KEY } from "@/lib/auth-constants";

const cookieOptions = {
  expires: 7,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export function setSessionToken(mode, token) {
  const key = mode === "central" ? CENTRAL_TOKEN_KEY : TENANT_TOKEN_KEY;
  Cookies.set(key, token, cookieOptions);
}

export function clearSessionToken(mode) {
  const key = mode === "central" ? CENTRAL_TOKEN_KEY : TENANT_TOKEN_KEY;
  Cookies.remove(key, { path: "/" });
}

export function clearAllSessionTokens() {
  Cookies.remove(CENTRAL_TOKEN_KEY, { path: "/" });
  Cookies.remove(TENANT_TOKEN_KEY, { path: "/" });
}

export function getSessionToken(mode) {
  const key = mode === "central" ? CENTRAL_TOKEN_KEY : TENANT_TOKEN_KEY;
  return Cookies.get(key);
}
