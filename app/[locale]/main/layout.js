import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar-collapse";
import AppShell from "@/shell/AppShell";
import { cookies } from "next/headers";

export default async function MainLayout({ children }) {
  const jar = await cookies();
  const initialCollapsed = jar.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";
  return <AppShell initialCollapsed={initialCollapsed}>{children}</AppShell>;
}
