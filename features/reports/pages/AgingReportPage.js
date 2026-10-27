"use client";

import { useReportBranch } from "@/features/accounting/useReportBranch";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Button, DatePicker, Select, Spin, Table, Typography } from "antd";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  REPORTS_QUERY_KEY,
  downloadCustomerAging,
  downloadSupplierAging,
  fetchCustomerAging,
  fetchSupplierAging,
} from "../api/reports.api";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

const BUCKETS = ["current", "1_30", "31_60", "61_90", "90_plus"];

/**
 * @param {"customers" | "suppliers"} kind
 */
function AgingReportTable({ kind }) {
  const t = useTranslations("BusinessReports");
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const { notification } = App.useApp();
  const access = useResourceAccess("business_reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const customers = kind === "customers";
  const partyKey = customers ? "customer" : "supplier";
  const idKey = customers ? "customer_id" : "supplier_id";

  const asOf = searchParams.get("as_of") || undefined;
  const partyId = searchParams.get(partyKey) || undefined;
  const branchFromUrl = Number(searchParams.get("branch") ?? "") || undefined;
  const { accessibleBranches, lockedBranchId, selectedBranchId, isPending: branchesPending, isFetched: branchesFetched } = useReportBranch(branchFromUrl);

  const setParams = useCallback(
    (/** @type {Record<string, string | undefined>} */ patch) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const params = useMemo(
    () => ({
      as_of: asOf,
      branch_id: selectedBranchId,
      [idKey]: partyId,
    }),
    [asOf, idKey, partyId, selectedBranchId],
  );

  const query = useQuery({
    queryKey: [...REPORTS_QUERY_KEY, kind, "aging", params],
    queryFn: () => (customers ? fetchCustomerAging(params) : fetchSupplierAging(params)),
    enabled: branchesFetched,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const report = query.data && typeof query.data === "object" ? query.data : null;
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const invoices = Array.isArray(report?.invoices) ? report.invoices : [];
  const pickerValue = asOf ? dayjs(asOf) : report?.as_of ? dayjs(report.as_of) : null;

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        const download = customers ? downloadCustomerAging : downloadSupplierAging;
        await download({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [customers, exporting, notification, params, t, tApiErrors],
  );

  const bucketTitle = useCallback(
    (/** @type {string} */ bucket) => {
      if (bucket === "current") return t("current");
      if (bucket === "1_30") return t("bucket1_30");
      if (bucket === "31_60") return t("bucket31_60");
      if (bucket === "61_90") return t("bucket61_90");
      return t("bucket90");
    },
    [t],
  );

  const columns = useMemo(() => {
    /** @type {Array<Record<string, unknown>>} */
    const cols = [
      { title: t("code"), dataIndex: "code", key: "code", width: 120 },
      { title: customers ? t("customer") : t("supplier"), dataIndex: "name", key: "name" },
    ];
    for (const bucket of BUCKETS) {
      cols.push({
        title: bucketTitle(bucket),
        dataIndex: bucket,
        key: bucket,
        width: 130,
        align: "right",
        render: (value) => money(value, currencySymbol),
      });
    }
    cols.push({
      title: t("total"),
      dataIndex: "total",
      key: "total",
      width: 140,
      align: "right",
      render: (value) => <strong>{money(value, currencySymbol)}</strong>,
    });
    return cols;
  }, [bucketTitle, currencySymbol, customers, t]);

  const invoiceColumns = useMemo(
    () => [
      { title: t("invoiceNumber"), dataIndex: "number", key: "number", width: 160 },
      { title: t("invoiceDate"), dataIndex: "invoice_date", key: "invoice_date", width: 140, render: (value) => formatTenantDate(value) },
      { title: t("dueDate"), dataIndex: "due_on", key: "due_on", width: 140, render: (value) => formatTenantDate(value) },
      { title: t("current"), dataIndex: "bucket", key: "bucket", width: 120, render: (value) => bucketTitle(String(value ?? "")) },
      { title: t("amount"), dataIndex: "net_to_pay", key: "net_to_pay", align: "right", render: (value) => money(value, currencySymbol) },
    ],
    [bucketTitle, currencySymbol, t],
  );

  const branchOptions = accessibleBranches
    .map((branch) => {
      const id = Number(branch.id);
      if (!Number.isFinite(id)) return null;
      return { value: id, label: String(branch.name ?? id) };
    })
    .filter(Boolean);

  const totals = report?.totals;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DatePicker
            value={pickerValue}
            onChange={(value) => setParams({ as_of: value ? value.format("YYYY-MM-DD") : undefined })}
            format={dayjsDatePattern()}
            placeholder={t("asOf")}
          />
          <Select
            className="min-w-40"
            allowClear={lockedBranchId == null}
            disabled={lockedBranchId != null}
            placeholder={t("branchAll")}
            value={selectedBranchId}
            onChange={(value) => setParams({ branch: value != null ? String(value) : undefined })}
            options={branchOptions}
            loading={branchesPending}
          />
        </div>
        {access.canExport ? (
          <TableExportMenu
            loading={exporting}
            onExportExcel={() => runExport("xlsx")}
            onExportPdf={() => runExport("pdf")}
          />
        ) : null}
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title={t("reportLoadError")} description={getLocalizedApiErrorMessage(tApiErrors, query.error)} />
      ) : null}

      <Table
        size="small"
        rowKey={idKey}
        loading={query.isPending}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1100 }}
        locale={{ emptyText: t("agingEmpty") }}
        onRow={(row) => ({
          onClick: () => setParams({ [partyKey]: String(row[idKey] ?? "") }),
          style: { cursor: "pointer" },
        })}
        summary={() => totals ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><strong>{t("totals")}</strong></Table.Summary.Cell>
            {BUCKETS.map((bucket, index) => (
              <Table.Summary.Cell key={bucket} index={index + 2} align="right">
                <strong>{money(totals[bucket], currencySymbol)}</strong>
              </Table.Summary.Cell>
            ))}
            <Table.Summary.Cell index={7} align="right"><strong>{money(totals.total, currencySymbol)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        ) : null}
      />

      {partyId ? (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <Typography.Title level={5} className="!mb-0">{t("openInvoices")}</Typography.Title>
            <Button onClick={() => setParams({ [partyKey]: undefined })}>
              {customers ? t("clearDetail") : t("clearSupplierDetail")}
            </Button>
          </div>
          <Table
            size="small"
            rowKey="id"
            columns={invoiceColumns}
            dataSource={invoices}
            pagination={false}
            locale={{ emptyText: t("agingEmpty") }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** @param {{ kind: "customers" | "suppliers" }} props */
export default function AgingReportPage({ kind }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
        <AgingReportTable kind={kind} />
      </Suspense>
    </div>
  );
}
