import { ROUTES } from "@/components/shell/sidebar/main-nav";
import { redirect } from "@/i18n/navigation";

/** Default Settings landing — opens Company Profile. */
export default async function SettingsPage({ params }) {
  const { locale } = await params;
  redirect({ href: ROUTES.settingsCompanyProfile, locale });
}
