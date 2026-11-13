"use client";

import AnalyticsReportPage from "@/features/reports/components/AnalyticsReportPage";

/** @type {import("@/features/reports/components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {
  name: "purchase-price-history",
  titleKey: "purchasePriceHistoryTitle",
  permission: "business_reports",
  filters: ["dateRange", "item", "supplier"],
};

export default function PurchasePriceHistoryPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
