import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { documentActionsColumn, renderDocumentStatus } from "@/shared/components/tables/treasuryDocumentActions";
import { Typography } from "antd";

export function getExpenseVoucherStatusLabel(value, t) {
  return t(`status_${value ?? "draft"}`);
}

/**
 * @param {(key: string) => string} t `useTranslations("ExpenseVouchers")`
 * @param {{ onView?: Function; onEdit?: Function; onDelete?: Function; onPost?: Function; onReverse?: Function }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getExpenseVoucherTableColumns(t, actions = {}) {
  return [
    {
      title: t("colNumber"),
      dataIndex: "voucher_number",
      key: "voucher_number",
      width: 200,
      render: (value) =>
        value ? (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    { title: t("colDate"), dataIndex: "voucher_date", key: "voucher_date", width: 120, render: (v) => formatTenantDate(v) || "—" },
    {
      title: t("colPaidFrom"),
      key: "cash",
      width: 220,
      ellipsis: true,
      render: (_, r) => (r?.cash_bank_account ? `${r.cash_bank_account.code} — ${r.cash_bank_account.name}` : "—"),
    },
    { title: t("colPayee"), dataIndex: "payee", key: "payee", width: 200, ellipsis: true, render: (v, r) => v || r?.supplier_name || "—" },
    {
      title: t("colTotal"),
      dataIndex: "total",
      key: "total",
      width: 160,
      align: "right",
      render: (v, r) => `${formatTenantMoney(v)} ${r?.cash_bank_account?.currency_code ?? ""}`,
    },
    { title: t("colStatus"), dataIndex: "status", key: "status", width: 110, render: (v) => renderDocumentStatus(v, t) },
    documentActionsColumn(t, actions),
  ];
}
