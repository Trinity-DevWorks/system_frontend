"use client";

import { Link } from "@/i18n/navigation";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useAuthMe } from "@/lib/auth-me";
import { usePermissions } from "@/lib/permissions";
import { formatTenantDate, formatTenantDateTime, formatTenantMoneyWithSymbol, formatTenantNumber } from "@/lib/tenant-format";
import { useTenantModules } from "@/lib/tenant-modules";
import {
  AccountBookOutlined,
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  DollarOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Empty, Spin, Statistic, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { FEATURES, ROUTES } from "../../registry";
import TrendChart from "../components/TrendChart";
import { useTenantOverviewQuery } from "../queries/useOverviewQuery";

/** @param {unknown} value */
function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {unknown} value
 * @param {unknown} symbol
 */
function money(value, symbol) {
  return formatTenantMoneyWithSymbol(value, symbol) || "\u2014";
}

/**
 * @param {{ period?: string, total?: unknown }[] | null | undefined} trend
 */
function monthChange(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const current = asNumber(trend[trend.length - 1]?.total);
  const previous = asNumber(trend[trend.length - 2]?.total);
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return { pct, label: `${pct > 0 ? "+" : ""}${pct}%` };
}

/**
 * @param {unknown} rows
 * @param {string} primaryCode
 */
function currencyBreakdown(rows, primaryCode) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (rows.length === 1 && String(rows[0]?.code ?? "") === primaryCode) return null;
  return rows
    .map((row) => formatTenantMoneyWithSymbol(row?.amount, row?.symbol || row?.code))
    .filter(Boolean)
    .join(" \u00b7 ");
}

/**
 * @param {{
 *   icon: import("react").ComponentType,
 *   tone?: string,
 *   title: string,
 *   value: string,
 *   valueColor?: string,
 *   lines?: { text: string, color?: string }[],
 * }} props
 */
function KpiCard({ icon: Icon, tone = "var(--ant-color-primary)", title, value, valueColor, lines = [] }) {
  return (
    <Card className="h-full">
      <div
        className="mb-3 flex size-9 items-center justify-center rounded-lg text-base"
        style={{ background: `color-mix(in srgb, ${tone} 12%, transparent)`, color: tone }}
      >
        <Icon />
      </div>
      <Statistic title={title} value={value} styles={valueColor ? { content: { color: valueColor } } : undefined} />
      {lines.length > 0 ? (
        <div className="mt-2 flex flex-col gap-0.5">
          {lines.map((line) => (
            <Typography.Text key={line.text} className="text-xs" style={line.color ? { color: line.color } : undefined} type={line.color ? undefined : "secondary"}>
              {line.text}
            </Typography.Text>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * @param {{ href: string, title: string, value: number, urgent?: boolean }} props
 */
function AttentionCard({ href, title, value, urgent = false }) {
  const hot = urgent && value > 0;
  return (
    <Link href={href} className="block h-full text-inherit no-underline">
      <Card hoverable className="h-full" size="small">
        <Statistic
          title={title}
          value={value}
          styles={hot ? { content: { color: "var(--ant-color-error)" } } : undefined}
        />
      </Card>
    </Link>
  );
}

/**
 * @param {string} status
 * @param {(key: string) => string} t
 */
function statusTag(status, t) {
  if (status === "posted") return <Tag color="success">{t("statusPosted")}</Tag>;
  if (status === "reversed") return <Tag color="warning">{t("statusReversed")}</Tag>;
  if (status === "draft") return <Tag>{t("statusDraft")}</Tag>;
  return status ? <Tag>{status}</Tag> : null;
}

/**
 * @param {string} status
 * @param {(key: string) => string} t
 */
function alertTag(status, t) {
  if (status === "out_of_stock") return <Tag color="error">{t("alertOutOfStock")}</Tag>;
  if (status === "below_safety") return <Tag color="warning">{t("alertBelowSafety")}</Tag>;
  return <Tag color="gold">{t("alertBelowReorder")}</Tag>;
}

/**
 * @param {{
 *   title: string,
 *   href: string,
 *   rows: Record<string, unknown>[],
 * }} props
 */
function DocumentList({ title, href, rows }) {
  const t = useTranslations("Overview");
  return (
    <Card
      title={title}
      className="h-full"
      extra={<Link href={href}>{t("viewAll")}</Link>}
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("recentEmpty")} />
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ant-color-border-secondary)] p-0">
          {rows.map((row) => (
            <li key={String(row.id)} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.number || "\u2014"}</div>
                <Typography.Text type="secondary" className="text-xs">
                  {(row.party || "\u2014")} {"\u00b7"} {formatTenantDate(row.date) || "\u2014"}
                </Typography.Text>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm tabular-nums">{money(row.grand_total, row.currency_symbol || row.currency_code)}</span>
                {statusTag(String(row.status ?? ""), t)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function OverviewPage() {
  const t = useTranslations("Overview");
  const tShell = useTranslations("Shell");
  const tApiErrors = useTranslations("ApiErrors");
  const { me } = useAuthMe();
  const { can, isReady: permissionsReady } = usePermissions();
  const { hasModule } = useTenantModules();
  const { data, isPending, isError, error, isFetching, refetch } = useTenantOverviewQuery();

  const overview = data && typeof data === "object" ? /** @type {Record<string, any>} */ (data) : null;

  if (isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="p-4">
        <Alert
          type="error"
          showIcon
          title={t("loadError")}
          description={getLocalizedApiErrorMessage(tApiErrors, error)}
          action={
            <Button size="small" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  const sales = overview.sales ?? null;
  const purchasing = overview.purchasing ?? null;
  const inventory = overview.inventory ?? null;
  const accounting = overview.accounting ?? null;
  const directory = overview.directory ?? {};
  const currency = overview.currency ?? null;
  const symbol = currency?.symbol || currency?.code || "";
  const currencyCode = currency?.code ? String(currency.code) : "";
  const companyName = String(overview.company_name || "").trim();
  const personName = typeof me?.name === "string" && me.name.trim() ? me.name.trim() : companyName;
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 17 ? "greetingAfternoon" : "greetingEvening";
  const branchName = overview.branch?.name ? String(overview.branch.name) : "";
  const operational = Boolean(sales || purchasing || inventory || accounting);
  const salesChange = sales ? monthChange(sales.trend) : null;
  const purchaseChange = purchasing ? monthChange(purchasing.trend) : null;
  const openSalesCurrencies = sales ? currencyBreakdown(sales.open_by_currency, currencyCode) : null;
  const openPurchaseCurrencies = purchasing ? currencyBreakdown(purchasing.open_by_currency, currencyCode) : null;

  /** @type {{ key: string, node: import("react").ReactNode }[]} */
  const kpis = [];
  if (sales) {
    const lines = [
      { text: t("todayAmount", { amount: money(sales.today_total, symbol) }) },
    ];
    if (salesChange) {
      lines.push({
        text: t("vsLastMonth", { change: salesChange.label }),
        color: salesChange.pct > 0 ? "var(--ant-color-success)" : salesChange.pct < 0 ? "var(--ant-color-error)" : undefined,
      });
    }
    const salesAreNet = sales.credits_month != null && asNumber(sales.credits_month) !== 0;
    if (salesAreNet) {
      lines.push({ text: t("creditsAmount", { amount: money(sales.credits_month, symbol) }) });
    }
    kpis.push({
      key: "sales",
      node: (
        <KpiCard
          icon={ShoppingCartOutlined}
          title={salesAreNet ? t("netSales") : t("postedSales")}
          value={money(sales.month_total, symbol)}
          lines={lines}
        />
      ),
    });
    kpis.push({
      key: "receivables",
      node: (
        <KpiCard
          icon={DollarOutlined}
          tone="var(--ant-color-success)"
          title={t("openInvoices")}
          value={money(sales.open_total, symbol)}
          valueColor={asNumber(sales.overdue_count) > 0 ? "var(--ant-color-error)" : undefined}
          lines={[
            asNumber(sales.overdue_count) > 0
              ? { text: t("overdueHint", { count: sales.overdue_count, amount: money(sales.overdue_total, symbol) }), color: "var(--ant-color-error)" }
              : { text: t("nothingOverdue") },
            ...(openSalesCurrencies ? [{ text: openSalesCurrencies }] : []),
          ]}
        />
      ),
    });
    if (sales.collected_month != null) {
      kpis.push({
        key: "collected",
        node: (
          <KpiCard
            icon={AccountBookOutlined}
            tone="var(--ant-color-success)"
            title={t("collected")}
            value={money(sales.collected_month, symbol)}
            lines={[{ text: t("thisMonth") }]}
          />
        ),
      });
    }
  }
  if (purchasing) {
    const lines = [{ text: t("todayAmount", { amount: money(purchasing.today_total, symbol) }) }];
    if (purchaseChange) {
      lines.push({ text: t("vsLastMonth", { change: purchaseChange.label }) });
    }
    kpis.push({
      key: "purchases",
      node: (
        <KpiCard
          icon={ShoppingOutlined}
          tone="var(--ant-color-warning)"
          title={t("postedPurchases")}
          value={money(purchasing.month_total, symbol)}
          lines={lines}
        />
      ),
    });
    kpis.push({
      key: "payables",
      node: (
        <KpiCard
          icon={FileDoneOutlined}
          tone="var(--ant-color-warning)"
          title={t("openBills")}
          value={money(purchasing.open_total, symbol)}
          valueColor={asNumber(purchasing.overdue_count) > 0 ? "var(--ant-color-error)" : undefined}
          lines={[
            asNumber(purchasing.overdue_count) > 0
              ? { text: t("overdueHint", { count: purchasing.overdue_count, amount: money(purchasing.overdue_total, symbol) }), color: "var(--ant-color-error)" }
              : { text: t("nothingOverdue") },
            ...(openPurchaseCurrencies ? [{ text: openPurchaseCurrencies }] : []),
          ]}
        />
      ),
    });
    if (purchasing.paid_month != null) {
      kpis.push({
        key: "paid",
        node: (
          <KpiCard
            icon={AccountBookOutlined}
            tone="var(--ant-color-warning)"
            title={t("paidSuppliers")}
            value={money(purchasing.paid_month, symbol)}
            lines={[{ text: t("thisMonth") }]}
          />
        ),
      });
    }
  }
  if (inventory) {
    const count = asNumber(inventory.alert_count);
    kpis.push({
      key: "alerts",
      node: (
        <KpiCard
          icon={AlertOutlined}
          tone={count > 0 ? "var(--ant-color-error)" : "var(--ant-color-success)"}
          title={t("stockAlerts")}
          value={String(count)}
          valueColor={count > 0 ? "var(--ant-color-error)" : "var(--ant-color-success)"}
          lines={[{ text: count > 0 ? t("stockNeedsReorder") : t("stockClear") }]}
        />
      ),
    });
  }
  if (accounting?.net_month != null) {
    const net = asNumber(accounting.net_month);
    kpis.push({
      key: "net",
      node: (
        <KpiCard
          icon={net < 0 ? ArrowDownOutlined : ArrowUpOutlined}
          tone={net < 0 ? "var(--ant-color-error)" : "var(--ant-color-success)"}
          title={t("netIncome")}
          value={money(accounting.net_month, symbol)}
          valueColor={net < 0 ? "var(--ant-color-error)" : "var(--ant-color-success)"}
          lines={[{ text: t("thisMonth") }]}
        />
      ),
    });
  }

  /** @type {{ key: string, title: string, href: string, value: number, urgent?: boolean }[]} */
  const attention = [];
  if (sales) {
    attention.push({ key: "draft-sales", title: t("draftSales"), href: ROUTES.salesInvoices, value: asNumber(sales.draft_count) });
    attention.push({ key: "overdue-sales", title: t("overdueSales"), href: ROUTES.salesInvoices, value: asNumber(sales.overdue_count), urgent: true });
  }
  if (purchasing) {
    attention.push({ key: "draft-purchases", title: t("draftPurchases"), href: ROUTES.purchaseInvoices, value: asNumber(purchasing.draft_count) });
    attention.push({ key: "overdue-purchases", title: t("overduePurchases"), href: ROUTES.purchaseInvoices, value: asNumber(purchasing.overdue_count), urgent: true });
  }
  if (accounting?.draft_count != null) {
    attention.push({ key: "journals", title: t("draftJournals"), href: ROUTES.journalEntries, value: asNumber(accounting.draft_count) });
  }

  /** @type {{ key: string, label: string, value: number }[]} */
  const records = [];
  if (directory.customers != null) records.push({ key: "customers", label: t("customers"), value: asNumber(directory.customers) });
  if (directory.suppliers != null) records.push({ key: "suppliers", label: t("suppliers"), value: asNumber(directory.suppliers) });
  if (directory.items != null) records.push({ key: "items", label: t("items"), value: asNumber(directory.items) });
  if (directory.users != null) records.push({ key: "users", label: t("users"), value: asNumber(directory.users) });

  const shortcuts = !operational && permissionsReady
    ? FEATURES.filter((feature) => {
        if (feature.nav === false || !feature.labelKey || feature.id === "overview") return false;
        if (feature.module && !hasModule(feature.module)) return false;
        if (feature.permission && !can(feature.permission, "view")) return false;
        return true;
      }).slice(0, 8)
    : [];

  const salesAreNet = sales?.credits_month != null && asNumber(sales.credits_month) !== 0;
  const recentSales = Array.isArray(sales?.recent) ? sales.recent : [];
  const recentPurchases = Array.isArray(purchasing?.recent) ? purchasing.recent : [];
  const alerts = Array.isArray(inventory?.alerts) ? inventory.alerts : [];
  const showChart = Boolean(sales || purchasing);
  const showBooks = accounting?.revenue_month != null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Typography.Title level={3} style={{ margin: 0 }}>
            {personName ? t(greetingKey, { name: personName }) : companyName || t("workspace")}
          </Typography.Title>
          <Typography.Text type="secondary">
            {[companyName, branchName, formatTenantDate(overview.generated_at)].filter(Boolean).join(" \u00b7 ")}
          </Typography.Text>
        </div>
        <div className="flex items-center gap-3">
          <Typography.Text type="secondary" className="text-xs">
            {t("generatedAt", { time: formatTenantDateTime(overview.generated_at) || "\u2014" })}
          </Typography.Text>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            {t("refresh")}
          </Button>
        </div>
      </div>

      {currencyCode ? (
        <Typography.Text type="secondary" className="text-xs">
          {t("figuresIn", { currency: currencyCode })}
        </Typography.Text>
      ) : (
        <Alert
          type="info"
          showIcon
          title={t("currencyMissing")}
          action={
            can("company_settings", "view") ? (
              <Link href={ROUTES.settingsCompanySettings}>{t("setCurrency")}</Link>
            ) : null
          }
        />
      )}

      {!operational ? (
        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {t("quietTitle")}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{t("quietBody")}</Typography.Paragraph>
          {shortcuts.length > 0 ? (
            <>
              <Typography.Text strong>{t("startHere")}</Typography.Text>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {shortcuts.map((feature) => {
                  const Icon = feature.icon ?? TeamOutlined;
                  return (
                    <Link key={feature.id} href={feature.path} className="text-inherit no-underline">
                      <Card hoverable size="small">
                        <div className="flex items-center gap-3">
                          <Icon />
                          <span className="truncate">{tShell(feature.labelKey)}</span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {kpis.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.key} className="min-w-0">{kpi.node}</div>
          ))}
        </div>
      ) : null}

      {attention.length > 0 ? (
        <div>
          <Typography.Title level={5}>{t("attention")}</Typography.Title>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attention.map((item) => (
              <AttentionCard key={item.key} href={item.href} title={item.title} value={item.value} urgent={item.urgent} />
            ))}
          </div>
        </div>
      ) : null}

      {showChart || showBooks || records.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {showChart ? (
            <Card title={t("activity")} className={showBooks || records.length > 0 ? "xl:col-span-2" : "xl:col-span-3"}>
              <TrendChart
                sales={sales?.trend ?? null}
                purchases={purchasing?.trend ?? null}
                symbol={symbol}
                salesLabel={salesAreNet ? t("netSales") : t("legendSales")}
                purchasesLabel={t("legendPurchases")}
              />
            </Card>
          ) : null}

          {showBooks || records.length > 0 ? (
            <div className={`flex flex-col gap-4 ${showChart ? "" : "xl:col-span-3"}`}>
              {showBooks ? (
                <Card title={t("books")}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Statistic title={t("revenue")} value={money(accounting.revenue_month, symbol)} />
                    <Statistic title={t("expenses")} value={money(accounting.expense_month, symbol)} />
                    <Statistic
                      title={t("netIncome")}
                      value={money(accounting.net_month, symbol)}
                      styles={{ content: { color: asNumber(accounting.net_month) < 0 ? "var(--ant-color-error)" : "var(--ant-color-success)" } }}
                    />
                  </div>
                  {accounting.posted_month_count != null ? (
                    <Typography.Text type="secondary" className="mt-3 block text-xs">
                      {t("postedJournals", { count: accounting.posted_month_count })}
                    </Typography.Text>
                  ) : null}
                </Card>
              ) : null}
              {records.length > 0 ? (
                <Card title={t("directory")}>
                  <div className="grid grid-cols-2 gap-4">
                    {records.map((record) => (
                      <Statistic key={record.key} title={record.label} value={record.value} />
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {sales || purchasing ? (
        <div className={`grid grid-cols-1 gap-4 ${sales && purchasing ? "xl:grid-cols-2" : ""}`}>
          {sales ? <DocumentList title={t("recentSales")} href={ROUTES.salesInvoices} rows={recentSales} /> : null}
          {purchasing ? <DocumentList title={t("recentPurchases")} href={ROUTES.purchaseInvoices} rows={recentPurchases} /> : null}
        </div>
      ) : null}

      {inventory ? (
        <Card
          title={t("alerts")}
          extra={<Link href={ROUTES.stockPurchasingAlerts}>{t("viewAll")}</Link>}
        >
          {alerts.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("alertsEmpty")} />
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ant-color-border-secondary)] p-0">
              {alerts.map((row, index) => (
                <li key={`${row.item_code}-${row.warehouse_name}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{row.item_name || row.item_code || "\u2014"}</div>
                    <Typography.Text type="secondary" className="text-xs">
                      {[row.item_code, row.warehouse_name].filter(Boolean).join(" \u00b7 ")}
                    </Typography.Text>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {alertTag(String(row.status ?? ""), t)}
                    <Typography.Text type="secondary" className="text-xs">
                      {t("onHand", { qty: formatTenantNumber(row.on_hand_qty, { trimTrailingZeros: true }) || row.on_hand_qty })}
                    </Typography.Text>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
