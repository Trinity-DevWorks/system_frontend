"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = { name: "depreciation-schedule", titleKey: "depreciationScheduleTitle", permission: "accounting_reports", filters: ["branch", "days"], daysLabelKey: "months", defaults: { days: "12" } };

export default function DepreciationSchedulePage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
