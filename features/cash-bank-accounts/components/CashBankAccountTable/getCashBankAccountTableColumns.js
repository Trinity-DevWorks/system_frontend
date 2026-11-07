import { formatTenantMoney } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/shared/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, FileSearchOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag, Typography } from "antd";

export function getCashBankAccountStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("CashBankAccounts")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onStatement?: (record: any) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getCashBankAccountTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onStatement } = actions;
  return [
    {
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (value) => (value ? <Typography.Text code className="text-xs">{value}</Typography.Text> : "—"),
    },
    { title: t("colName"), dataIndex: "name", key: "name", width: 220, ellipsis: true },
    {
      title: t("colType"),
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v) => <Tag color={v === "bank" ? "blue" : "gold"}>{v === "bank" ? t("typeBank") : t("typeCash")}</Tag>,
    },
    { title: t("colCurrency"), dataIndex: "currency_code", key: "currency_code", width: 100, render: (v) => v || "—" },
    {
      title: t("colLedgerAccount"),
      key: "account",
      width: 220,
      ellipsis: true,
      render: (_, r) => (r?.account ? `${r.account.code} — ${r.account.name}` : "—"),
    },
    { title: t("colBalance"), dataIndex: "balance", key: "balance", width: 150, align: "right", render: (v) => formatTenantMoney(v) },
    { title: t("colStatus"), dataIndex: "is_active", key: "is_active", width: 100, render: (value) => renderActiveInactiveStatus(value, t) },
    {
      title: t("colActions"),
      key: "actions",
      fixed: "end",
      width: 72,
      align: "center",
      render: (_, record) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "view", label: t("actionView"), icon: <EyeOutlined />, disabled: !onView, onClick: () => onView?.(record) },
              { key: "statement", label: t("actionStatement"), icon: <FileSearchOutlined />, disabled: !onStatement, onClick: () => onStatement?.(record) },
              { key: "edit", label: t("actionEdit"), icon: <EditOutlined />, disabled: !onEdit, onClick: () => onEdit?.(record) },
              { type: "divider" },
              { key: "delete", label: t("actionDelete"), icon: <DeleteOutlined />, danger: true, disabled: !onDelete, onClick: () => onDelete?.(record) },
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
