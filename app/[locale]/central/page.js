import { CENTRAL_HOME_PATH } from "@/features/central/registry";
import { redirect } from "@/i18n/navigation";

/** `/central` is only a landing hop; the route guard handles users without overview access. */
export default async function CentralIndexPage({ params }) {
  const { locale } = await params;
  redirect({ href: CENTRAL_HOME_PATH, locale });
}
