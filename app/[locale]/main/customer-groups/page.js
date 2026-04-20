import EmptyModulePage from "@/components/shared/EmptyModulePage";
import { useTranslations } from "next-intl";

export default function CustomerGroupsPage() {
  const t = useTranslations("Shell");

  return <EmptyModulePage title={t("navCustomerGroups")} />;
}
