"use client";

import { useForwardArrow } from "@/lib/direction-arrow";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useResourceAccess } from "@/lib/permissions";
import {
  formatTenantDate,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Card,
  DatePicker,
  Empty,
  Progress,
  Select,
  Spin,
  Table,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import {
  BUDGETS_QUERY_KEY,
  downloadBudgetVsActual,
  fetchBudgetVsActual,
  fetchBudgets,
} from "../api/budgets.api";

const PERIODS = ["year", "ytd", "q1", "q2", "q3", "q4", "month"];

/**
 * From / to for the chosen period inside the budget's fiscal year.
 *
 * @param {string} period
 * @param {string} yearStart  YYYY-MM-DD
 * @param {import("dayjs").Dayjs | null} month
 */
function periodRange(period, yearStart, month) {
  const start = dayjs(yearStart);
  const end = start.add(1, "year").subtract(1, "day");
  if (period === "ytd") {
    const today = dayjs();
    return [
      start,
      today.isBefore(end) ? (today.isBefore(start) ? start : today) : end,
    ];
  }
  if (period.startsWith("q")) {
    const q = Number(period.slice(1)) - 1;
    const from = start.add(q * 3, "month");
    return [from, from.add(3, "month").subtract(1, "day")];
  }
  if (period === "month" && month)
    return [month.startOf("month"), month.endOf("month")];
  return [start, end];
}

/**
 * Revenue / expense / net: actual, budget and the variance (green when favourable).
 *
 * @param {{ label: string; data: Record<string, any> | undefined; money: (v: unknown) => string; t: (key: string, values?: Record<string, unknown>) => string }} props
 */
function SummaryCard({ label, data, money, t }) {
  if (!data) return null;
  return (
    <Card size="small">
      <Typography.Text type="secondary" className="text-xs">
        {label}
      </Typography.Text>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold tabular-nums">
          {money(data.actual)}
        </span>
        <Typography.Text type="secondary" className="text-xs tabular-nums">
          {t("ofBudget", { budget: money(data.budget) })}
        </Typography.Text>
      </div>
      <Typography.Text
        type={
          Number(data.variance) === 0
            ? "secondary"
            : data.favourable
              ? "success"
              : "danger"
        }
        className="text-xs tabular-nums"
      >
        {t("varianceLabel")}: {Number(data.variance) > 0 ? "+" : ""}
        {money(data.variance)}
      </Typography.Text>
    </Card>
  );
}

function BudgetVsActualView() {
  const t = useTranslations("Budgets");
  const arrow = useForwardArrow();
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const { settings } = useCompanySettings();
  const access = useResourceAccess("accounting_reports");
  const searchParams = useSearchParams();
  const [budgetId, setBudgetId] = useState(
    /** @type {string | undefined} */ (
      searchParams.get("budget_id") ?? undefined
    ),
  );
  const [period, setPeriod] = useState("ytd");
  const [month, setMonth] = useState(
    /** @type {import("dayjs").Dayjs | null} */ (dayjs().startOf("month")),
  );
  const [level, setLevel] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [exporting, setExporting] = useState(false);
  const money = (value) =>
    formatTenantMoneyWithSymbol(
      value ?? 0,
      settings.primaryCurrencySymbol ?? "",
    );

  const budgets = useQuery({
    queryKey: [...BUDGETS_QUERY_KEY, "options"],
    queryFn: () => fetchBudgets({ per_page: 100 }),
  });
  const budgetRows = useMemo(
    () => (Array.isArray(budgets.data?.rows) ? budgets.data.rows : []),
    [budgets.data],
  );
  // Default to the approved budget of the current year, else the newest one.
  const selectedId =
    budgetId ??
    budgetRows.find(
      (b) => b.status === "approved" && Number(b.year) === dayjs().year(),
    )?.id ??
    budgetRows.find((b) => b.status === "approved")?.id ??
    budgetRows[0]?.id;
  const selected = budgetRows.find((b) => String(b.id) === String(selectedId));
  const [from, to] = selected
    ? periodRange(period, selected.fiscal_year_start, month)
    : [null, null];
  const params = selected
    ? {
        budget_id: String(selected.id),
        from: from?.format("YYYY-MM-DD"),
        to: to?.format("YYYY-MM-DD"),
        level,
      }
    : null;

  const report = useQuery({
    queryKey: ["tenant", "budget-vs-actual", params],
    queryFn: () =>
      fetchBudgetVsActual(/** @type {Record<string, any>} */ (params)),
    enabled: params != null,
  });
  const rows = Array.isArray(report.data?.rows) ? report.data.rows : [];
  const summary = report.data?.meta?.summary;

  const runExport = async (format) => {
    if (!params || exporting) return;
    setExporting(true);
    try {
      await downloadBudgetVsActual({
        ...params,
        format,
        locale: getLocaleFromPathname(window.location.pathname),
      });
    } catch (error) {
      notification.error({
        title: t("exportError"),
        description: getLocalizedApiErrorMessage(tApiErrors, error),
      });
    } finally {
      setExporting(false);
    }
  };

  const varianceText = (row) => {
    const value = Number(row.variance ?? 0);
    const text = `${value > 0 ? "+" : ""}${money(row.variance)}`;
    return value === 0 ? (
      text
    ) : (
      <Typography.Text type={row.favourable ? "success" : "danger"}>
        {text}
      </Typography.Text>
    );
  };

  const columns = [
    {
      title: t("colAccount"),
      key: "account",
      render: (_, row) => (
        <div
          className={[
            "flex min-w-0 items-center gap-2",
            row.is_group ? "font-semibold" : "",
          ].join(" ")}
          style={{ paddingInlineStart: (Number(row.level ?? 1) - 1) * 16 }}
        >
          <Typography.Text type="secondary" className="shrink-0 tabular-nums">
            {row.account_code}
          </Typography.Text>
          <span className="truncate">{row.account_name}</span>
        </div>
      ),
    },
    {
      title: t("colBudget"),
      dataIndex: "budget",
      width: 140,
      align: "right",
      render: money,
    },
    {
      title: t("colActual"),
      dataIndex: "actual",
      width: 140,
      align: "right",
      render: money,
    },
    {
      title: t("colVariance"),
      key: "variance",
      width: 150,
      align: "right",
      render: (_, row) => varianceText(row),
    },
    {
      title: t("colUsed"),
      key: "used",
      width: 170,
      render: (_, row) =>
        row.used_percent == null ? (
          <Typography.Text type="secondary">{t("noBudget")}</Typography.Text>
        ) : (
          <Progress
            size="small"
            percent={Math.min(100, Math.round(Number(row.used_percent)))}
            format={() => `${Math.round(Number(row.used_percent))}%`}
            status={row.favourable ? "normal" : "exception"}
          />
        ),
    },
    {
      title: t("colYearBudget"),
      dataIndex: "year_budget",
      width: 140,
      align: "right",
      render: money,
    },
    {
      title: t("colRemaining"),
      dataIndex: "remaining",
      width: 140,
      align: "right",
      render: money,
    },
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs">{t("budget")}</span>
          <Select
            className="min-w-64"
            showSearch
            optionFilterProp="label"
            placeholder={t("chooseBudget")}
            value={selectedId ? String(selectedId) : undefined}
            onChange={setBudgetId}
            options={budgetRows.map((b) => ({
              value: String(b.id),
              label: `${b.name} · ${b.year}${b.version > 1 ? ` v${b.version}` : ""} · ${t(`status_${b.status}`)}`,
            }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs">{t("period")}</span>
          <Select
            className="min-w-40"
            value={period}
            onChange={setPeriod}
            options={PERIODS.map((value) => ({
              value,
              label: t(`period_${value}`),
            }))}
          />
        </label>
        {period === "month" ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs">{t("month")}</span>
            <DatePicker
              picker="month"
              format="MM/YYYY"
              value={month}
              onChange={setMonth}
              allowClear={false}
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="text-xs">{t("level")}</span>
          <Select
            className="min-w-36"
            allowClear
            placeholder={t("allLevels")}
            value={level}
            onChange={setLevel}
            options={[1, 2, 3, 4].map((value) => ({
              value,
              label: t("levelN", { level: value }),
            }))}
          />
        </label>
        {from && to ? (
          <Typography.Text type="secondary" className="pb-1 text-sm">
            {formatTenantDate(from.format("YYYY-MM-DD"))} {arrow}{" "}
            {formatTenantDate(to.format("YYYY-MM-DD"))}
          </Typography.Text>
        ) : null}
        <div className="ms-auto">
          {access.canExport && params ? (
            <TableExportMenu
              loading={exporting}
              onExportExcel={() => runExport("xlsx")}
              onExportPdf={() => runExport("pdf")}
            />
          ) : null}
        </div>
      </div>

      {!budgets.isPending && budgetRows.length === 0 ? (
        <Empty description={t("noBudgetsYet")} />
      ) : report.isError ? (
        <Alert
          type="error"
          showIcon
          title={getLocalizedApiErrorMessage(tApiErrors, report.error)}
        />
      ) : (
        <>
          {selected && selected.status !== "approved" ? (
            <Alert type="info" showIcon title={t("notApprovedInfo")} />
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SummaryCard
              label={t("totalRevenue")}
              data={summary?.revenue}
              money={money}
              t={t}
            />
            <SummaryCard
              label={t("totalExpense")}
              data={summary?.expense}
              money={money}
              t={t}
            />
            <SummaryCard
              label={t("netResult")}
              data={summary?.net}
              money={money}
              t={t}
            />
          </div>
          {report.isPending && params ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spin />
            </div>
          ) : (
            <Table
              size="small"
              rowKey="account_id"
              columns={columns}
              dataSource={rows}
              pagination={false}
              scroll={{ x: 1100 }}
              rowClassName={(row) =>
                row.is_group ? "bg-[var(--ant-color-fill-quaternary)]" : ""
              }
              locale={{ emptyText: t("reportEmpty") }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function BudgetVsActualPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      }
    >
      <BudgetVsActualView />
    </Suspense>
  );
}
