"use client";

import AnalyticsReportPage from "@/features/reports/components/AnalyticsReportPage";

/** @type {import("@/features/reports/components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {
  name: "price-changes",
  titleKey: "priceChangesTitle",
  permission: "business_reports",
  filters: ["dateRange", "field", "source", "category", "user"],
};

export default function PriceChangesReportPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
