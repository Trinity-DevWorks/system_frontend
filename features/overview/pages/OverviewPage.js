"use client";

import { OVERVIEW_QUERY_KEY, fetchOverview } from "@/features/reports/api/reports.api";
import { ROUTES } from "@/features/registry";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Spin, Statistic, Table, Typography } from "antd";
import { useTranslations } from "next-intl";

const BUCKETS = ["current", "1_30", "31_60", "61_90", "90_plus", "total"];

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

/**
 * @param {{ title: string; value: string; href?: string | null }} props
 */
function MetricCard({ title, value, href }) {
  const body = (
    <Card size="small" hoverable={Boolean(href)}>
      <Statistic title={title} value={value} />
    </Card>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block text-inherit no-underline">
      {body}
    </Link>
  );
}

export default function OverviewPage() {
  const t = useTranslations("Overview");
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const symbol = settings.primaryCurrencySymbol;
  const reports = useResourceAccess("business_reports");
  const query = useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: fetchOverview,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const data = query.data && typeof query.data === "object" ? query.data : null;
  const asOf = typeof data?.as_of === "string" ? data.as_of : "";
  const sales = data?.sales ?? null;
  const purchases = data?.purchases ?? null;
  const inventory = data?.inventory ?? null;
  const aging = data?.aging ?? null;
  const empty = data && !sales && !purchases && !inventory && !aging;
  const canOpenReports = reports.canView;

  const bucketTitle = (/** @type {string} */ bucket) => {
    if (bucket === "current") return t("current");
    if (bucket === "1_30") return t("bucket1_30");
    if (bucket === "31_60") return t("bucket31_60");
    if (bucket === "61_90") return t("bucket61_90");
    if (bucket === "90_plus") return t("bucket90");
    return t("total");
  };

  /** @type {Array<Record<string, unknown>>} */
  const agingRows = [];
  if (aging?.receivables) {
    agingRows.push({
      key: "receivables",
      label: t("receivables"),
      href: canOpenReports ? `${ROUTES.customerAging}?as_of=${asOf}` : null,
      ...aging.receivables,
    });
  }
  if (aging?.payables) {
    agingRows.push({
      key: "payables",
      label: t("payables"),
      href: canOpenReports ? `${ROUTES.supplierAging}?as_of=${asOf}` : null,
      ...aging.payables,
    });
  }

  const agingColumns = [
    {
      title: t("aging"),
      dataIndex: "label",
      key: "label",
      render: (value, row) => row.href ? <Link href={String(row.href)}>{value}</Link> : value,
    },
    ...BUCKETS.map((bucket) => ({
      title: bucketTitle(bucket),
      dataIndex: bucket,
      key: bucket,
      align: "right",
      render: (value) => money(value, symbol),
    })),
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
          {t("title")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="!mb-0">
          {asOf ? t("subtitle", { date: formatTenantDate(asOf), currency: data?.currency_code || "" }) : t("loading")}
        </Typography.Paragraph>
      </div>

      {query.isPending ? <Spin /> : null}
      {query.isError ? (
        <Alert type="error" showIcon title={t("loadError")} description={getLocalizedApiErrorMessage(tApiErrors, query.error)} />
      ) : null}
      {empty ? <Alert type="info" showIcon title={t("empty")} /> : null}

      {sales ? (
        <section className="flex flex-col gap-2">
          <Typography.Title level={5} className="!mb-0">{t("sales")}</Typography.Title>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title={t("today")}
              value={money(sales.today, symbol)}
              href={canOpenReports ? `${ROUTES.salesByPeriod}?from=${asOf}&to=${asOf}&group_by=day` : null}
            />
            <MetricCard
              title={t("monthToDate")}
              value={money(sales.month_to_date, symbol)}
              href={canOpenReports ? ROUTES.salesByPeriod : null}
            />
            <MetricCard
              title={t("openReceivables")}
              value={money(sales.open_receivables, symbol)}
              href={canOpenReports ? `${ROUTES.customerAging}?as_of=${asOf}` : null}
            />
          </div>
        </section>
      ) : null}

      {purchases ? (
        <section className="flex flex-col gap-2">
          <Typography.Title level={5} className="!mb-0">{t("purchases")}</Typography.Title>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title={t("today")}
              value={money(purchases.today, symbol)}
              href={canOpenReports ? `${ROUTES.purchasesByPeriod}?from=${asOf}&to=${asOf}&group_by=day` : null}
            />
            <MetricCard
              title={t("monthToDate")}
              value={money(purchases.month_to_date, symbol)}
              href={canOpenReports ? ROUTES.purchasesByPeriod : null}
            />
            <MetricCard
              title={t("openPayables")}
              value={money(purchases.open_payables, symbol)}
              href={canOpenReports ? `${ROUTES.supplierAging}?as_of=${asOf}` : null}
            />
          </div>
        </section>
      ) : null}

      {inventory ? (
        <section className="flex flex-col gap-2">
          <Typography.Title level={5} className="!mb-0">{t("inventory")}</Typography.Title>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title={t("stockValue")}
              value={money(inventory.stock_value, symbol)}
              href={canOpenReports ? ROUTES.stockValuation : null}
            />
            <MetricCard
              title={t("lowStock")}
              value={String(inventory.low_stock_count ?? 0)}
              href={ROUTES.stockPurchasingAlerts}
            />
          </div>
        </section>
      ) : null}

      {agingRows.length > 0 ? (
        <section className="flex flex-col gap-2">
          <Typography.Title level={5} className="!mb-0">{t("aging")}</Typography.Title>
          <Table
            size="small"
            rowKey="key"
            pagination={false}
            columns={agingColumns}
            dataSource={agingRows}
          />
        </section>
      ) : null}
    </div>
  );
}
