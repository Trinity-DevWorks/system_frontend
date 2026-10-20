"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Table, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { closeFiscalYear, fetchFiscalYears, reverseFiscalYear } from "../api/accounting.api";
import { ACCOUNTING_PERIOD_QUERY_KEY, ACCOUNTING_REPORTS_QUERY_KEY, FISCAL_YEARS_QUERY_KEY } from "../queries/accountingQueryKeys";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

function isLoss(value) {
  return Number(value) < -0.00005;
}

export default function FiscalYearsPage() {
  const t = useTranslations("FiscalYears");
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess("accounting_periods");
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: FISCAL_YEARS_QUERY_KEY,
    queryFn: fetchFiscalYears,
    enabled: access.canView,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: FISCAL_YEARS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ACCOUNTING_PERIOD_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ACCOUNTING_REPORTS_QUERY_KEY }),
    ]);
  };

  const closeYear = useMutation({
    mutationFn: (/** @type {string} */ endsOn) => closeFiscalYear({ ends_on: endsOn }),
    onSuccess: async () => {
      message.success(t("closeSuccess"));
      await refresh();
    },
    onError: (error) => {
      notification.error({ title: t("closeError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const reverseYear = useMutation({
    mutationFn: (/** @type {number} */ id) => reverseFiscalYear(id),
    onSuccess: async () => {
      message.success(t("reverseSuccess"));
      await refresh();
    },
    onError: (error) => {
      notification.error({ title: t("reverseError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const rows = Array.isArray(query.data) ? query.data : [];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div>
        <Typography.Title level={3} className="!mb-1">
          {t("title")}
        </Typography.Title>
        <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title={t("loadError")} description={getLocalizedApiErrorMessage(tApiErrors, query.error)} />
      ) : null}

      <Table
        size="middle"
        rowKey={(row) => `${row.starts_on}-${row.ends_on}`}
        loading={query.isPending}
        pagination={false}
        locale={{ emptyText: t("empty") }}
        dataSource={rows}
        columns={[
          {
            title: t("colStart"),
            dataIndex: "starts_on",
            render: (value) => formatTenantDate(value),
          },
          {
            title: t("colEnd"),
            dataIndex: "ends_on",
            render: (value) => formatTenantDate(value),
          },
          {
            title: t("colStatus"),
            dataIndex: "status",
            render: (value) => (
              <Tag color={value === "closed" ? "default" : "green"}>{t(`status_${value}`)}</Tag>
            ),
          },
          {
            title: t("colResult"),
            dataIndex: "result",
            align: "right",
            render: (value) => {
              const loss = isLoss(value);
              const label = Math.abs(Number(value)) < 0.00005 ? null : loss ? t("loss") : t("profit");
              return (
                <span>
                  {money(Math.abs(Number(value || 0)), currencySymbol)}
                  {label ? <Typography.Text type="secondary" className="ms-2">{label}</Typography.Text> : null}
                </span>
              );
            },
          },
          {
            title: t("colEntry"),
            dataIndex: "closing_entry_number",
            render: (value) => value || "—",
          },
          {
            title: "",
            key: "actions",
            width: 140,
            render: (_, row) => {
              if (row.can_close && access.canEdit) {
                const loss = isLoss(row.result);
                return (
                  <Button
                    type="primary"
                    size="small"
                    loading={closeYear.isPending}
                    onClick={() => modal.confirm({
                      title: t("closeConfirmTitle"),
                      content: t(loss ? "closeConfirmLoss" : "closeConfirmProfit", {
                        date: formatTenantDate(row.ends_on),
                        amount: money(Math.abs(Number(row.result || 0)), currencySymbol),
                      }),
                      okText: t("closeYear"),
                      onOk: () => closeYear.mutateAsync(row.ends_on),
                    })}
                  >
                    {t("closeYear")}
                  </Button>
                );
              }
              if (row.can_reverse && access.canReopen && row.id != null) {
                return (
                  <Button
                    size="small"
                    loading={reverseYear.isPending}
                    onClick={() => modal.confirm({
                      title: t("reverseConfirmTitle"),
                      content: t("reverseConfirm", { date: formatTenantDate(row.ends_on) }),
                      okText: t("reverse"),
                      onOk: () => reverseYear.mutateAsync(row.id),
                    })}
                  >
                    {t("reverse")}
                  </Button>
                );
              }
              return null;
            },
          },
        ]}
      />
    </div>
  );
}
