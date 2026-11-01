"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = {"name": "item-movement", "titleKey": "itemMovementTitle", "permission": "business_reports", "filters": ["item", "warehouse", "dateRange"], "needs": ["item_id"]};

export default function ItemMovementPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
