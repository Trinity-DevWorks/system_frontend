import EmptyModulePage from "@/components/shared/EmptyModulePage";
import { useTranslations } from "next-intl";

export default function SuppliersPage() {
  const t = useTranslations("Shell");

  return <EmptyModulePage title={t("navSuppliers")} />;
}
