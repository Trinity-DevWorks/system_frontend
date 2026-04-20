import EmptyModulePage from "@/components/shared/EmptyModulePage";
import { useTranslations } from "next-intl";

export default function UnitGroupsPage() {
  const t = useTranslations("Shell");

  return <EmptyModulePage title={t("navUnitGroups")} />;
}
