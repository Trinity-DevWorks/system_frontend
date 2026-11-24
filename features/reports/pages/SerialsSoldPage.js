"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "serials-sold", "titleKey": "serialsSoldTitle", "permission": "business_reports", "filters": ["dateRange", "warehouse", "item"], "defaults": {}, "serverTable": true};

export default function SerialsSoldPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
