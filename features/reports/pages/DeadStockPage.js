"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "dead-stock", "titleKey": "deadStockTitle", "permission": "business_reports", "filters": ["warehouse", "days"], "defaults": {"days": "90"}, "serverTable": true};

export default function DeadStockPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
