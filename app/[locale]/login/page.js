import { headers } from "next/headers";
import LoginClient from "./LoginClient";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function LoginPage() {
  const h = await headers();
  const initialHost =
    forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return <LoginClient initialHost={initialHost} />;
}
