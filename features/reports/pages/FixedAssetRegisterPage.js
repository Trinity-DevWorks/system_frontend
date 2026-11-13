"use client";

import AnalyticsReportPage from "../components/AnalyticsReportPage";

/** @type {import("../components/AnalyticsReportPage").AnalyticsReportConfig} */
const CONFIG = { name: "fixed-asset-register", titleKey: "fixedAssetRegisterTitle", permission: "accounting_reports", filters: ["asOf", "branch"] };

export default function FixedAssetRegisterPage() {
  return <AnalyticsReportPage config={CONFIG} />;
}
