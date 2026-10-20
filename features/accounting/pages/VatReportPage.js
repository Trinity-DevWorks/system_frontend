"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, DatePicker, Modal, Spin, Table, Typography } from "antd";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { accountDisplayName } from "../accountingUtils";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  createVatSettlement,
  downloadVatReport,
  fetchVatReport,
  fetchVatSettlements,
  previewVatSettlement,
  reverseVatSettlement,
} from "../api/accounting.api";
import { ACCOUNTING_REPORTS_QUERY_KEY } from "../queries/accountingQueryKeys";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

function isOff(value) {
  if (value == null || value === "") return false;
  return Math.abs(Number(value)) > 0.00005;
}

function VatReportTable() {
  const t = useTranslations("FinancialReports");
  const locale = useLocale();
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const { notification, message, modal } = App.useApp();
  const reportsAccess = useResourceAccess("accounting_reports");
  const settlementsAccess = useResourceAccess("vat_settlements");
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null} */ (null),
  );
  const [exporting, setExporting] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [periodTo, setPeriodTo] = useState(/** @type {import("dayjs").Dayjs | null} */ (null));
  const [entryDate, setEntryDate] = useState(/** @type {import("dayjs").Dayjs | null} */ (dayjs()));

  const params = useMemo(
    () => ({
      from: dateRange?.[0]?.format("YYYY-MM-DD"),
      to: dateRange?.[1]?.format("YYYY-MM-DD"),
    }),
    [dateRange],
  );

  const query = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "vat-report", params],
    queryFn: () => fetchVatReport(params),
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const settlements = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "vat-settlements"],
    queryFn: fetchVatSettlements,
    enabled: settlementsAccess.canView,
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const preview = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "vat-preview", periodTo?.format("YYYY-MM-DD")],
    queryFn: () => previewVatSettlement(periodTo.format("YYYY-MM-DD")),
    enabled: settleOpen && Boolean(periodTo),
  });

  const report = query.data && typeof query.data === "object" ? query.data : null;
  const pickerValue =
    dateRange ??
    (report?.from && report?.to ? [dayjs(report.from), dayjs(report.to)] : null);
  const settlementRows = Array.isArray(settlements.data) ? settlements.data : [];
  const check = report?.ledger_check;
  const ledgerOff = check && (isOff(check.output_difference) || isOff(check.input_difference));

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        await downloadVatReport({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [exporting, notification, params, t, tApiErrors],
  );

  const settle = useMutation({
    mutationFn: () => createVatSettlement({
      period_to: periodTo.format("YYYY-MM-DD"),
      entry_date: (entryDate ?? dayjs()).format("YYYY-MM-DD"),
    }),
    onSuccess: async () => {
      message.success(t("settleSuccess"));
      setSettleOpen(false);
      await queryClient.invalidateQueries({ queryKey: ACCOUNTING_REPORTS_QUERY_KEY });
    },
    onError: (error) => {
      notification.error({ title: t("settleError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const reverse = useMutation({
    mutationFn: (/** @type {string} */ id) => reverseVatSettlement(id),
    onSuccess: async () => {
      message.success(t("reverseSuccess"));
      await queryClient.invalidateQueries({ queryKey: ACCOUNTING_REPORTS_QUERY_KEY });
    },
    onError: (error) => {
      notification.error({ title: t("reverseError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const rateColumns = useMemo(
    () => [
      { title: t("taxRate"), dataIndex: "tax_rate", key: "tax_rate", width: 140 },
      { title: t("taxableAmount"), dataIndex: "taxable_amount", key: "taxable_amount", align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("vatAmount"), dataIndex: "vat", key: "vat", align: "right", render: (value) => money(value, currencySymbol) },
    ],
    [currencySymbol, t],
  );

  const net = Number(report?.net ?? 0);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <DatePicker.RangePicker
          value={pickerValue}
          onChange={(range) => setDateRange(range ?? null)}
          allowEmpty={[true, true]}
          format={dayjsDatePattern()}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {reportsAccess.canExport ? (
            <TableExportMenu
              loading={exporting}
              onExportExcel={() => runExport("xlsx")}
              onExportPdf={() => runExport("pdf")}
            />
          ) : null}
          {settlementsAccess.canAdd ? (
            <Button type="primary" onClick={() => { setPeriodTo(pickerValue?.[1] ?? dayjs()); setEntryDate(dayjs()); setSettleOpen(true); }}>
              {t("settleVat")}
            </Button>
          ) : null}
        </div>
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title={t("reportLoadError")} description={getLocalizedApiErrorMessage(tApiErrors, query.error)} />
      ) : null}
      {ledgerOff ? (
        <Alert
          type="warning"
          showIcon
          title={t("ledgerCheck")}
          description={t("ledgerCheckDetail", {
            output: money(check.output_difference, currencySymbol),
            input: money(check.input_difference, currencySymbol),
          })}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <RateBlock title={t("outputVat")} rows={report?.output ?? []} total={report?.output_vat} columns={rateColumns} currencySymbol={currencySymbol} loading={query.isPending} totalLabel={t("total")} emptyText={t("reportEmpty")} />
        <RateBlock title={t("inputVat")} rows={report?.input ?? []} total={report?.input_vat} columns={rateColumns} currencySymbol={currencySymbol} loading={query.isPending} totalLabel={t("total")} emptyText={t("reportEmpty")} />
      </div>

      <Typography.Title level={5} className="!mb-0">
        {t("netVat")}: {money(report?.net, currencySymbol)}
        {report ? <Typography.Text type="secondary" className="ms-2 text-sm">{net > 0.00005 ? t("vatPayable") : net < -0.00005 ? t("vatCredit") : ""}</Typography.Text> : null}
      </Typography.Title>

      {settlementsAccess.canView ? (
        <div>
          <Typography.Title level={5}>{t("settlements")}</Typography.Title>
          <Table
            size="small"
            rowKey="id"
            loading={settlements.isPending}
            pagination={false}
            locale={{ emptyText: t("noSettlements") }}
            dataSource={settlementRows}
            columns={[
              { title: t("colDate"), dataIndex: "entry_date", key: "entry_date", render: (value) => formatTenantDate(value) },
              { title: t("periodTo"), dataIndex: "period_to", key: "period_to", render: (value) => formatTenantDate(value) },
              { title: t("outputVat"), dataIndex: "output", key: "output", align: "right", render: (value) => money(value, currencySymbol) },
              { title: t("inputVat"), dataIndex: "input", key: "input", align: "right", render: (value) => money(value, currencySymbol) },
              { title: t("netVat"), dataIndex: "net", key: "net", align: "right", render: (value) => money(value, currencySymbol) },
              { title: t("colStatus"), dataIndex: "status", key: "status", render: (value) => t(`status_${value}`) },
              {
                title: "",
                key: "actions",
                width: 120,
                render: (_, row) => row.can_reverse && settlementsAccess.canReverse ? (
                  <Button
                    size="small"
                    loading={reverse.isPending}
                    onClick={() => modal.confirm({
                      title: t("reverse"),
                      content: t("reverseConfirm"),
                      okText: t("reverse"),
                      onOk: () => reverse.mutateAsync(row.id),
                    })}
                  >
                    {t("reverse")}
                  </Button>
                ) : null,
              },
            ]}
          />
        </div>
      ) : null}

      <Modal
        title={t("settleVat")}
        open={settleOpen}
        onCancel={() => setSettleOpen(false)}
        okText={t("postSettlement")}
        confirmLoading={settle.isPending}
        okButtonProps={{ disabled: !periodTo || !entryDate || preview.isError || preview.isPending }}
        onOk={() => settle.mutate()}
        destroyOnHidden
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span>{t("periodTo")}</span>
            <DatePicker value={periodTo} onChange={setPeriodTo} format={dayjsDatePattern()} />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t("entryDate")}</span>
            <DatePicker value={entryDate} onChange={setEntryDate} format={dayjsDatePattern()} />
          </label>
          {preview.isError ? (
            <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, preview.error)} />
          ) : null}
          {preview.data ? (
            <>
              <Typography.Text>
                {t("netVat")}: {money(preview.data.net, currencySymbol)}
              </Typography.Text>
              <Table
                size="small"
                pagination={false}
                rowKey={(row) => `${row.role}-${row.account_id}`}
                dataSource={preview.data.lines ?? []}
                columns={[
                  { title: t("colAccount"), key: "account", render: (_, row) => `${row.code}  ${accountDisplayName(row, locale)}` },
                  { title: t("colDebit"), dataIndex: "debit", align: "right", render: (value) => money(value, currencySymbol) },
                  { title: t("colCredit"), dataIndex: "credit", align: "right", render: (value) => money(value, currencySymbol) },
                ]}
              />
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function RateBlock({ title, rows, total, columns, currencySymbol, loading, totalLabel, emptyText }) {
  return (
    <div className="min-w-0">
      <Typography.Title level={5} className="!mb-2">{title}</Typography.Title>
      <Table
        size="small"
        rowKey="tax_rate"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><strong>{totalLabel}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><strong>{money(total, currencySymbol)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

export default function VatReportPage() {
  return (
    <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
      <VatReportTable />
    </Suspense>
  );
}
