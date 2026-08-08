import { redirect } from "next/navigation";

/**
 * `/` is routed by `proxy.js` (central → /login|/central, tenant → /login|/main/overview).
 * This page remains only as a fallback if a request reaches the App Router.
 */
export default function Home() {
  redirect("/login");
}
