"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "warranty-expiring", "titleKey": "warrantyExpiringTitle", "permission": "business_reports", "filters": ["warehouse", "item", "days", "includeExpired"], "defaults": {"days": "30"}, "serverTable": true, "daysLabelKey": "warrantyDays"};

export default function WarrantyExpiringPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
