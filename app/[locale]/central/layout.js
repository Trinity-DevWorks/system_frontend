import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar-collapse";
import CentralShell from "@/shell/CentralShell";
import { cookies } from "next/headers";

export default async function CentralLayout({ children }) {
  const jar = await cookies();
  const initialCollapsed = jar.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";
  return <CentralShell initialCollapsed={initialCollapsed}>{children}</CentralShell>;
}
