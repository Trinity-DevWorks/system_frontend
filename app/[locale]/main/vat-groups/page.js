import EmptyModulePage from "@/components/shared/EmptyModulePage";
import { useTranslations } from "next-intl";

export default function VatGroupsPage() {
  const t = useTranslations("Shell");

  return <EmptyModulePage title={t("navVatGroups")} />;
}
