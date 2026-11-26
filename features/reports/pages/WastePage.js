"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/**
 * Waste: customer returns written off as waste and stock taken out with a waste reason (spoiled, expired,
 * damaged), with what it cost.
 *
 * @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig}
 */
const CONFIG = {
  name: "waste",
  titleKey: "wasteTitle",
  permission: "business_reports",
  filters: ["dateRange", "branch", "item", "source"],
  sourceOptions: ["return", "spoilage"],
  defaults: {},
  serverTable: true,
};

export default function WastePage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
