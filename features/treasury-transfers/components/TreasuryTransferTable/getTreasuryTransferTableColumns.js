import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { documentActionsColumn, renderDocumentStatus } from "@/shared/components/tables/treasuryDocumentActions";
import { Typography } from "antd";

export function getTreasuryTransferStatusLabel(value, t) {
  return t(`status_${value ?? "draft"}`);
}

/**
 * @param {(key: string) => string} t `useTranslations("TreasuryTransfers")`
 * @param {{ onView?: Function; onEdit?: Function; onDelete?: Function; onPost?: Function; onReverse?: Function }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getTreasuryTransferTableColumns(t, actions = {}) {
  const account = (a) => (a ? `${a.code} — ${a.name}` : "—");
  return [
    {
      title: t("colNumber"),
      dataIndex: "transfer_number",
      key: "transfer_number",
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
    { title: t("colDate"), dataIndex: "transfer_date", key: "transfer_date", width: 120, render: (v) => formatTenantDate(v) || "—" },
    { title: t("colFrom"), key: "from", width: 220, ellipsis: true, render: (_, r) => account(r?.from_account) },
    { title: t("colTo"), key: "to", width: 220, ellipsis: true, render: (_, r) => account(r?.to_account) },
    {
      title: t("colAmount"),
      key: "amount",
      width: 200,
      align: "right",
      render: (_, r) => {
        const sent = `${formatTenantMoney(r?.amount_from)} ${r?.from_account?.currency_code ?? ""}`;
        const sameCurrency = r?.from_account?.currency_id === r?.to_account?.currency_id;
        return sameCurrency ? sent : `${sent} → ${formatTenantMoney(r?.amount_to)} ${r?.to_account?.currency_code ?? ""}`;
      },
    },
    { title: t("colStatus"), dataIndex: "status", key: "status", width: 110, render: (v) => renderDocumentStatus(v, t) },
    documentActionsColumn(t, actions),
  ];
}
