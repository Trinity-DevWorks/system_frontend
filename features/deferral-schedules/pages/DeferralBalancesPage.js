"use client";

import { useResourceAccess } from "@/lib/permissions";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { App, Button, DatePicker, Select, Table, Tabs } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  exportDeferralBalances,
  fetchDeferralBalances,
  fetchDeferralForecast,
} from "../api/deferralReports.api";

export default function DeferralBalancesPage() {
  const t = useTranslations("DeferralReports");
  const access = useResourceAccess("accounting_reports");
  const { message } = App.useApp();
  const [asOf, setAsOf] = useState(dayjs());
  const [kind, setKind] = useState("");
  const filters = {
    as_of: asOf.format("YYYY-MM-DD"),
    ...(kind ? { kind } : {}),
  };
  const balances = useQuery({
    queryKey: ["tenant", "deferral-balances", filters],
    queryFn: () => fetchDeferralBalances(filters),
  });
  const forecast = useQuery({
    queryKey: ["tenant", "deferral-forecast", kind],
    queryFn: () => fetchDeferralForecast(kind ? { kind } : {}),
  });

  const rows = (balances.data?.accounts ?? []).flatMap((account) => [
    ...account.schedules.map((schedule) => ({
      key: schedule.id,
      ...schedule,
      account: account.account,
      gl: null,
    })),
    {
      key: `${account.account.id}-gl`,
      name: t("glRow"),
      account: account.account,
      remaining_amount_primary: account.schedules_remaining,
      gl_balance: account.gl_balance,
      difference: account.difference,
      isGl: true,
    },
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          value={asOf}
          format={dayjsDatePattern()}
          onChange={(value) => value && setAsOf(value)}
        />
        <Select
          allowClear
          placeholder={t("filterKind")}
          style={{ width: 180 }}
          value={kind || undefined}
          onChange={(value) => setKind(value ?? "")}
          options={[
            { value: "prepaid_expense", label: t("kind_prepaid_expense") },
            { value: "deferred_revenue", label: t("kind_deferred_revenue") },
          ]}
        />
        {access.canExport ? (
          <Button
            onClick={async () => {
              const blob = await exportDeferralBalances({
                ...filters,
                format: "xlsx",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "deferral-balances.xlsx";
              link.click();
              URL.revokeObjectURL(url);
              message.success(t("exported"));
            }}
          >
            {t("export")}
          </Button>
        ) : null}
      </div>
      <Tabs
        items={[
          {
            key: "balances",
            label: t("tabBalances"),
            children: (
              <Table
                size="small"
                rowKey="key"
                loading={balances.isPending}
                dataSource={rows}
                pagination={false}
                columns={[
                  {
                    title: t("colAccount"),
                    key: "account",
                    // <bdi>: "code name" keeps its order inside the Arabic (right-to-left) table.
                    render: (_, row) => (
                      <bdi>{`${row.account?.code ?? ""} ${row.account?.name ?? ""}`}</bdi>
                    ),
                  },
                  { title: t("colSchedule"), dataIndex: "schedule_number" },
                  {
                    title: t("colName"),
                    dataIndex: "name",
                    render: (value) => <bdi>{value}</bdi>,
                  },
                  {
                    title: t("colRemaining"),
                    dataIndex: "remaining_amount_primary",
                    render: (value) => formatTenantMoneyWithSymbol(value, ""),
                  },
                  {
                    title: t("colGl"),
                    dataIndex: "gl_balance",
                    render: (value) =>
                      value == null
                        ? ""
                        : formatTenantMoneyWithSymbol(value, ""),
                  },
                  {
                    title: t("colDifference"),
                    dataIndex: "difference",
                    render: (value) =>
                      value == null ? (
                        ""
                      ) : (
                        <span
                          className={
                            Number(value) !== 0 ? "text-red-600" : undefined
                          }
                        >
                          {formatTenantMoneyWithSymbol(value, "")}
                        </span>
                      ),
                  },
                ]}
              />
            ),
          },
          {
            key: "forecast",
            label: t("tabForecast"),
            children: (
              <Table
                size="small"
                rowKey={(row) => row.account?.id}
                loading={forecast.isPending}
                dataSource={forecast.data?.rows ?? []}
                pagination={false}
                columns={[
                  {
                    title: t("colAccount"),
                    key: "account",
                    // <bdi>: "code name" keeps its order inside the Arabic (right-to-left) table.
                    render: (_, row) => (
                      <bdi>{`${row.account?.code ?? ""} ${row.account?.name ?? ""}`}</bdi>
                    ),
                  },
                  ...(forecast.data?.months ?? []).map((month) => ({
                    title: month,
                    key: month,
                    render: (_, row) =>
                      formatTenantMoneyWithSymbol(row.amounts?.[month], ""),
                  })),
                  {
                    title: t("colTotal"),
                    dataIndex: "total",
                    render: (value) => formatTenantMoneyWithSymbol(value, ""),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
