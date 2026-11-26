"use client";

import { Tag } from "antd";
import { useTranslations } from "next-intl";

/** One note on a sales document saying whether its prices include VAT. */
export default function DocumentTaxModeNote({ pricesIncludeTax, taxEnabled }) {
  const t = useTranslations("PriceLists");
  if (!taxEnabled) return null;
  return <Tag className="!me-0">{pricesIncludeTax ? t("documentPricesIncludeTax") : t("documentPricesExcludeTax")}</Tag>;
}
