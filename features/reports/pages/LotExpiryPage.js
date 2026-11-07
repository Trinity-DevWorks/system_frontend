"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "lot-expiry", "titleKey": "lotExpiryTitle", "permission": "business_reports", "filters": ["warehouse", "days", "includeExpired"], "defaults": {"days": "30"}, "serverTable": true};

export default function LotExpiryPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
