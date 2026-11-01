"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "sales-analysis", "titleKey": "salesAnalysisTitle", "permission": "business_reports", "filters": ["dateRange", "groupBy", "branch"], "defaults": {"group_by": "item"}, "serverTable": true};

export default function SalesAnalysisPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
