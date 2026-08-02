import { headers } from "next/headers";
import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function ResetPasswordPage() {
  const h = await headers();
  const initialHost =
    forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return (
    <Suspense fallback={null}>
      <ResetPasswordClient initialHost={initialHost} />
    </Suspense>
  );
}
