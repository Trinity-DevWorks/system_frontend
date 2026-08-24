import { headers } from "next/headers";
import ForgotPasswordClient from "@/features/auth/pages/ForgotPasswordPage";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function ForgotPasswordPage() {
  const h = await headers();
  const initialHost =
    forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return <ForgotPasswordClient initialHost={initialHost} />;
}
