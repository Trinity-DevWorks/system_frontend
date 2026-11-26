"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/**
 * Negative stock: items below zero per warehouse (sold without stock), with the cost they were issued at.
 *
 * @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig}
 */
const CONFIG = {
  name: "negative-stock",
  titleKey: "negativeStockTitle",
  permission: "business_reports",
  filters: ["warehouse", "item"],
  defaults: {},
  serverTable: true,
};

export default function NegativeStockPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
