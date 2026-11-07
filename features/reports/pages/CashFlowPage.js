"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "cash-flow", "titleKey": "cashFlowTitle", "permission": "accounting_reports", "filters": ["dateRange", "branch"]};

export default function CashFlowPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
