"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "serials-in-stock", "titleKey": "serialsInStockTitle", "permission": "business_reports", "filters": ["warehouse", "item"], "defaults": {}, "serverTable": true};

export default function SerialsInStockPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
