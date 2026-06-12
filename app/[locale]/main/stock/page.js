import { ROUTES } from "@/components/shell/sidebar/main-nav";
import { redirect } from "@/i18n/navigation";

/** Default Stock landing — opens balances (primary view). */
export default async function StockPage({ params }) {
  const { locale } = await params;
  redirect({ href: ROUTES.stockBalances, locale });
}
