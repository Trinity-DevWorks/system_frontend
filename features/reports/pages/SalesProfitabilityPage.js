"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "sales-profitability", "titleKey": "salesProfitabilityTitle", "permission": "business_reports", "filters": ["dateRange", "branch"], "serverTable": true};

export default function SalesProfitabilityPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
