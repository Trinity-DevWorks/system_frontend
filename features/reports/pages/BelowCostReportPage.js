"use client";

import AnalyticsReportPage from "@/features/reports/components/AnalyticsReportPage";

/** @type {import("@/features/reports/components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = { name: "below-cost", titleKey: "belowCostTitle", permission: "business_reports", filters: [] };

export default function BelowCostReportPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
