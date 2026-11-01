"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "general-ledger", "titleKey": "generalLedgerTitle", "permission": "accounting_reports", "filters": ["dateRange", "branch", "accountRange"], "serverTable": true};

export default function GeneralLedgerPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
