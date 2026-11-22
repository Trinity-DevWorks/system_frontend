"use client";

import AnalyticsReportPage from "@/features/reports/components/AnalyticsReportPage";

/** @type {import("@/features/reports/components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = { name: "price-history", titleKey: "priceHistoryTitle", permission: "business_reports", filters: ["item"], needs: ["item_id"] };

export default function PriceHistoryReportPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
