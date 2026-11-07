"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, DatePicker, Spin, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { accountDisplayName } from "../accountingUtils";
import {
  createCurrencyRevaluation,
  fetchCurrencyRevaluations,
  previewCurrencyRevaluation,
  undoCurrencyRevaluation,
} from "../api/accounting.api";
import { ACCOUNTING_REPORTS_QUERY_KEY } from "../queries/accountingQueryKeys";

const QUERY_KEY = [...ACCOUNTING_REPORTS_QUERY_KEY, "currency-revaluations"];

/**
 * @param {unknown} value
 * @param {string | null | undefined} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol ?? "");
}

/**
 * Month-end currency revaluation: re-prices foreign-currency cash, customer and supplier balances at a
 * date's rate and books the gap as an unrealized gain/loss, reversed automatically the next day.
 */
function CurrencyRevaluationView() {
  const t = useTranslations("CurrencyRevaluation");
  const tApiErrors = useTranslations("ApiErrors");
  const locale = useLocale();
  const { settings } = useCompanySettings();
  const symbol = settings.primaryCurrencySymbol;
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("currency_revaluations");
  const queryClient = useQueryClient();

  const [date, setDate] = useState(/** @type {import("dayjs").Dayjs | null} */ (dayjs()));
  // Rates typed by the user, per currency id. Missing ones use the date's rate.
  const [rates, setRates] = useState(/** @type {Record<string, number | null>} */ ({}));
  const dateString = date?.format("YYYY-MM-DD") ?? null;
  // A new date starts again from that date's rates.
  const changeDate = (/** @type {import("dayjs").Dayjs | null} */ next) => {
    setDate(next);
    setRates({});
  };

  const history = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCurrencyRevaluations,
    enabled: access.canView,
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const preview = useQuery({
    queryKey: [...QUERY_KEY, "preview", dateString, rates],
    queryFn: () => previewCurrencyRevaluation(/** @type {string} */ (dateString), rates),
    enabled: access.canView && Boolean(dateString),
    staleTime: QUERY_STALE_TIME.ledger,
    placeholderData: (previous) => previous,
  });

  const data = preview.data && typeof preview.data === "object" ? preview.data : null;
  const lines = Array.isArray(data?.lines) ? data.lines : [];
  const rateRows = Array.isArray(data?.rates) ? data.rates : [];
  const historyRows = Array.isArray(history.data) ? history.data : [];
  const gain = Number(data?.gain ?? 0);
  const loss = Number(data?.loss ?? 0);

  const post = useMutation({
    mutationFn: () => {
      /** @type {Record<string, number | string>} */
      const body = {};
      for (const row of rateRows) {
        const rate = rates[String(row.currency_id)] ?? row.rate;
        if (rate != null && rate !== "") body[String(row.currency_id)] = rate;
      }
      return createCurrencyRevaluation({ date: /** @type {string} */ (dateString), rates: body });
    },
    onSuccess: async () => {
      message.success(t("postSuccess"));
      await queryClient.invalidateQueries({ queryKey: ACCOUNTING_REPORTS_QUERY_KEY });
    },
    onError: (error) => {
      notification.error({ title: t("postError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const undo = useMutation({
    mutationFn: (/** @type {string} */ day) => undoCurrencyRevaluation(day),
    onSuccess: async () => {
      message.success(t("undoSuccess"));
      await queryClient.invalidateQueries({ queryKey: ACCOUNTING_REPORTS_QUERY_KEY });
    },
    onError: (error) => {
      notification.error({ title: t("undoError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const confirmPost = () =>
    modal.confirm({
      title: t("postTitle"),
      content: t("postConfirm", {
        date: formatTenantDate(dateString),
        next: formatTenantDate(date ? date.add(1, "day").format("YYYY-MM-DD") : ""),
      }),
      okText: t("post"),
      onOk: () => post.mutateAsync(),
    });

  const lineColumns = useMemo(
    () => [
      {
        title: t("colAccount"),
        key: "account",
        render: (_, row) => `${row.account_code ?? ""}  ${accountDisplayName({ name: row.account_name, name_ar: row.account_name_ar }, locale)}`,
      },
      { title: t("colParty"), dataIndex: "party_name", key: "party", render: (value) => value || "—" },
      {
        title: t("colForeign"),
        key: "foreign",
        align: "right",
        render: (_, row) => `${money(row.foreign_balance, "")} ${row.currency_code ?? ""}`.trim(),
      },
      { title: t("colBooked"), dataIndex: "booked", key: "booked", align: "right", render: (value) => money(value, symbol) },
      { title: t("colRevalued"), dataIndex: "revalued", key: "revalued", align: "right", render: (value) => money(value, symbol) },
      {
        title: t("colDifference"),
        dataIndex: "difference",
        key: "difference",
        align: "right",
        render: (value) => (
          <Typography.Text type={Number(value) < 0 ? "danger" : "success"} className="tabular-nums">
            {money(value, symbol)}
          </Typography.Text>
        ),
      },
    ],
    [locale, symbol, t],
  );

  if (!access.canView) {
    return <Alert className="m-4" type="warning" showIcon title={t("noAccess")} />;
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span>{t("date")}</span>
          <DatePicker value={date} onChange={changeDate} format={dayjsDatePattern()} allowClear={false} />
        </label>
        {rateRows.map((row) => (
          <label key={row.currency_id} className="flex flex-col gap-1">
            <span>{t("rateFor", { code: row.code })}</span>
            <TenantNumberInput
              kind="rate"
              min={0.000000000001}
              className="w-[160px]"
              value={rates[String(row.currency_id)] ?? (row.rate != null ? Number(row.rate) : null)}
              onChange={(value) => setRates((prev) => ({ ...prev, [String(row.currency_id)]: value == null ? null : Number(value) }))}
            />
          </label>
        ))}
        {access.canAdd ? (
          <Button
            type="primary"
            className="ms-auto"
            loading={post.isPending}
            disabled={!dateString || preview.isPending || preview.isError || lines.length === 0}
            onClick={confirmPost}
          >
            {t("post")}
          </Button>
        ) : null}
      </div>

      {preview.isError ? (
        <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, preview.error)} />
      ) : null}

      <Table
        size="small"
        rowKey={(row) => `${row.account_id}-${row.currency_id}-${row.party_type ?? ""}-${row.party_id ?? ""}`}
        loading={preview.isFetching}
        pagination={false}
        locale={{ emptyText: t("empty") }}
        dataSource={lines}
        columns={lineColumns}
        scroll={{ x: "max-content" }}
      />

      <div className="flex flex-wrap justify-end gap-6 text-sm">
        <span>
          {t("totalGain")} <b className="tabular-nums">{money(gain, symbol)}</b>
        </span>
        <span>
          {t("totalLoss")} <b className="tabular-nums">{money(loss, symbol)}</b>
        </span>
      </div>

      <div>
        <Typography.Title level={5}>{t("history")}</Typography.Title>
        <Table
          size="small"
          rowKey="entry_id"
          loading={history.isPending}
          pagination={false}
          locale={{ emptyText: t("noHistory") }}
          dataSource={historyRows}
          scroll={{ x: "max-content" }}
          columns={[
            { title: t("date"), dataIndex: "date", key: "date", render: (value) => formatTenantDate(value) },
            { title: t("colEntry"), dataIndex: "entry_number", key: "entry_number" },
            { title: t("colReversal"), dataIndex: "reversal_date", key: "reversal_date", render: (value, row) => (value ? `${formatTenantDate(value)}  ${row.reversal_entry_number ?? ""}` : "—") },
            { title: t("totalGain"), dataIndex: "gain", key: "gain", align: "right", render: (value) => money(value, symbol) },
            { title: t("totalLoss"), dataIndex: "loss", key: "loss", align: "right", render: (value) => money(value, symbol) },
            {
              title: "",
              key: "actions",
              width: 110,
              render: (_, row) =>
                row.can_undo && access.canReverse ? (
                  <Button
                    size="small"
                    loading={undo.isPending}
                    onClick={() =>
                      modal.confirm({
                        title: t("undo"),
                        content: t("undoConfirm", { date: formatTenantDate(row.date) }),
                        okText: t("undo"),
                        okButtonProps: { danger: true },
                        onOk: () => undo.mutateAsync(row.date),
                      })
                    }
                  >
                    {t("undo")}
                  </Button>
                ) : null,
            },
          ]}
        />
      </div>
    </div>
  );
}

export default function CurrencyRevaluationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
      <CurrencyRevaluationView />
    </Suspense>
  );
}
