"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = { name: "depreciation-by-period", titleKey: "depreciationByPeriodTitle", permission: "accounting_reports", filters: ["dateRange", "branch"] };

export default function DepreciationByPeriodPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
