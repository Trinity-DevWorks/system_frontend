"use client";

import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { dayjsDatePattern, formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, DatePicker, Input, Modal, Select, Space, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { bounceCustomerCheque, clearCustomerCheque, fetchCustomerCheques } from "../api/customerCheques.api";

const QUERY_KEY = ["tenant", "customer-cheques"];
const STATUS_COLORS = { in_hand: "gold", cleared: "green", bounced: "red", cancelled: "default" };

/**
 * Cheques received from customers: in hand (in "Cheques to collect") until they clear into a bank
 * account, or bounce (the receipt is reversed and the invoice is open again).
 */
function CustomerChequesView() {
  const t = useTranslations("CustomerCheques");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("customer_cheques");
  const queryClient = useQueryClient();
  const { openStackedDrawer } = useGlobalDrawer();

  const [status, setStatus] = useState(/** @type {string | undefined} */ ("in_hand"));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(/** @type {Record<string, any> | null} */ (null));
  const [bankId, setBankId] = useState(/** @type {number | null} */ (null));
  const [clearDate, setClearDate] = useState(/** @type {import("dayjs").Dayjs | null} */ (dayjs()));

  const query = useQuery({
    queryKey: [...QUERY_KEY, status ?? "all", search, page],
    queryFn: () => fetchCustomerCheques({ status, search, page, per_page: 20 }),
    enabled: access.canView,
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const accountsQuery = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: () => fetchCashBankAccountNames(),
    staleTime: QUERY_STALE_TIME.catalog,
    enabled: clearing != null,
  });

  const rows = Array.isArray(query.data?.data) ? query.data.data : [];
  const total = Number(query.data?.total ?? rows.length);
  // A cheque clears into an active account in its own currency.
  const bankOptions = useMemo(
    () =>
      (Array.isArray(accountsQuery.data) ? accountsQuery.data : [])
        .filter((a) => a && a.is_active !== false && clearing != null && Number(a.currency_id) === Number(clearing.currency_id))
        .map((a) => ({ value: Number(a.id), label: `${a.code} — ${a.name}` })),
    [accountsQuery.data, clearing],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["tenant", "cash-bank-accounts"] });
  };

  const clear = useMutation({
    mutationFn: () => clearCustomerCheque(String(clearing?.id), { cash_bank_account_id: Number(bankId), date: clearDate?.format("YYYY-MM-DD") }),
    onSuccess: () => {
      message.success(t("clearSuccess"));
      setClearing(null);
      refresh();
    },
    onError: (error) => notification.error({ title: t("clearError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });
  const bounce = useMutation({
    mutationFn: (/** @type {string} */ id) => bounceCustomerCheque(id),
    onSuccess: () => {
      message.success(t("bounceSuccess"));
      refresh();
    },
    onError: (error) => notification.error({ title: t("bounceError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  if (!access.canView) {
    return <Alert className="m-4" type="warning" showIcon title={t("noAccess")} />;
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select
          className="w-[180px]"
          allowClear
          placeholder={t("allStatuses")}
          value={status}
          onChange={(value) => {
            setStatus(value ?? undefined);
            setPage(1);
          }}
          options={["in_hand", "cleared", "bounced", "cancelled"].map((value) => ({ value, label: t(`status_${value}`) }))}
        />
        <Input.Search
          className="w-[240px]"
          allowClear
          placeholder={t("searchPlaceholder")}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      {query.isError ? <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, query.error)} /> : null}

      <Table
        size="small"
        rowKey="id"
        loading={query.isFetching}
        dataSource={rows}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: t("empty") }}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: t("colNumber"), dataIndex: "cheque_number", key: "cheque_number" },
          { title: t("colCustomer"), key: "customer", render: (_, row) => row.customer?.name ?? "—" },
          { title: t("colBank"), dataIndex: "bank_name", key: "bank_name", render: (value) => value || "—" },
          {
            title: t("colDueDate"),
            dataIndex: "due_date",
            key: "due_date",
            render: (value, row) => (
              <Typography.Text type={row.status === "in_hand" && value && dayjs(value).isBefore(dayjs(), "day") ? "danger" : undefined}>
                {formatTenantDate(value)}
              </Typography.Text>
            ),
          },
          {
            title: t("colAmount"),
            key: "amount",
            align: "right",
            render: (_, row) => <span className="tabular-nums">{`${formatTenantMoney(row.amount)} ${row.currency?.code ?? ""}`.trim()}</span>,
          },
          {
            title: t("colStatus"),
            dataIndex: "status",
            key: "status",
            render: (value, row) => (
              <Space size={4}>
                <Tag color={STATUS_COLORS[value] ?? "default"} className="!m-0">{t(`status_${value}`)}</Tag>
                {value === "cleared" && row.cleared_cash_bank_account ? (
                  <Typography.Text type="secondary" className="text-xs">{row.cleared_cash_bank_account.code}</Typography.Text>
                ) : null}
              </Space>
            ),
          },
          {
            title: t("colReceipt"),
            key: "receipt",
            render: (_, row) => (
              <Button type="link" className="px-0" onClick={() => openStackedDrawer({ featureId: "customerReceipts", id: String(row.customer_receipt_id), mode: "view" })}>
                {row.receipt_number ?? "—"}
              </Button>
            ),
          },
          {
            title: "",
            key: "actions",
            render: (_, row) =>
              access.canEdit ? (
                <Space size={4}>
                  {row.status === "in_hand" ? (
                    <Button
                      size="small"
                      onClick={() => {
                        setClearing(row);
                        setBankId(null);
                        setClearDate(dayjs());
                      }}
                    >
                      {t("clear")}
                    </Button>
                  ) : null}
                  {row.status === "in_hand" || row.status === "cleared" ? (
                    <Button
                      size="small"
                      danger
                      loading={bounce.isPending}
                      onClick={() =>
                        modal.confirm({
                          title: t("bounce"),
                          content: t("bounceConfirm", { number: row.cheque_number }),
                          okText: t("bounce"),
                          okButtonProps: { danger: true },
                          onOk: () => bounce.mutateAsync(String(row.id)),
                        })
                      }
                    >
                      {t("bounce")}
                    </Button>
                  ) : null}
                </Space>
              ) : null,
          },
        ]}
      />

      <Modal
        open={clearing != null}
        title={t("clearTitle", { number: clearing?.cheque_number ?? "" })}
        okText={t("clear")}
        okButtonProps={{ disabled: bankId == null || clearDate == null }}
        confirmLoading={clear.isPending}
        onOk={() => clear.mutate()}
        onCancel={() => setClearing(null)}
        destroyOnHidden
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span>{t("bankAccount")}</span>
            <Select
              showSearch
              optionFilterProp="label"
              loading={accountsQuery.isPending}
              options={bankOptions}
              value={bankId}
              onChange={setBankId}
              placeholder={t("bankAccountPlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t("clearDate")}</span>
            <DatePicker value={clearDate} onChange={setClearDate} format={dayjsDatePattern()} allowClear={false} />
          </label>
        </div>
      </Modal>
    </div>
  );
}

export default function CustomerChequesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
      <CustomerChequesView />
    </Suspense>
  );
}
