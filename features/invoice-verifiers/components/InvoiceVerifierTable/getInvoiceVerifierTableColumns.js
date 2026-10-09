import { formatTenantDateTime } from "@/lib/tenant-format";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag, Tooltip, Typography } from "antd";
import {
  INVOICE_VERIFIER_ROLE_COLORS,
  INVOICE_VERIFIER_STATUS_COLORS,
  shortWalletAddress,
} from "../../utils/invoiceVerifierDrawerUtils";

/** @param {unknown} v */
const textOrDash = (v) => (typeof v === "string" && v.trim() ? v : "\u2014");

/**
 * @param {(key: string) => string} t `useTranslations("InvoiceVerifiers")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onResync?: (record: unknown) => void;
 *   onRemove?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getInvoiceVerifierTableColumns(t, actions = {}) {
  const { onView, onEdit, onResync, onRemove } = actions;
  return [
    {
      title: t("columnName"),
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("columnRole"),
      dataIndex: "role",
      key: "role",
      width: 150,
      render: (role) => <Tag color={INVOICE_VERIFIER_ROLE_COLORS[role]}>{t(`roles.${role}`)}</Tag>,
    },
    {
      title: t("columnActsFor"),
      dataIndex: "party_side",
      key: "party_side",
      width: 140,
      render: (side) => t(side === "buyer" ? "actsFor.buyer" : "actsFor.supplier"),
    },
    {
      title: t("columnWallet"),
      dataIndex: "wallet_address",
      key: "wallet_address",
      width: 210,
      render: (wallet, record) => (
        <span className="inline-flex items-center gap-1">
          <Tooltip title={wallet}>
            <Typography.Text copyable={{ text: wallet }} className="font-mono text-xs" dir="ltr">
              {shortWalletAddress(String(wallet))}
            </Typography.Text>
          </Tooltip>
          <Tag className="!m-0">{record.wallet_type === "safe" ? t("typeSafe") : t("typeWallet")}</Tag>
        </span>
      ),
    },
    {
      title: t("columnEmail"),
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: textOrDash,
    },
    {
      title: t("columnPhone"),
      dataIndex: "phone",
      key: "phone",
      width: 140,
      ellipsis: true,
      render: (v) => (typeof v === "string" && v.trim() ? <span dir="ltr">{v}</span> : "\u2014"),
    },
    {
      title: t("columnStatus"),
      dataIndex: "chain_status",
      key: "chain_status",
      width: 130,
      render: (status, record) => {
        const tag = <Tag color={INVOICE_VERIFIER_STATUS_COLORS[status]}>{t(`statuses.${status}`)}</Tag>;
        return record.chain_error ? <Tooltip title={record.chain_error}>{tag}</Tooltip> : tag;
      },
    },
    {
      title: t("columnSyncedAt"),
      dataIndex: "chain_synced_at",
      key: "chain_synced_at",
      width: 168,
      render: (value) => formatTenantDateTime(value) || "\u2014",
    },
    {
      title: t("columnActions"),
      key: "actions",
      fixed: "end",
      width: 72,
      align: "center",
      render: (_, record) => {
        const removing = record.chain_status === "removing";
        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "view",
                  label: t("actionView"),
                  icon: <EyeOutlined />,
                  disabled: !onView,
                  onClick: () => onView?.(record),
                },
                {
                  key: "edit",
                  label: t("edit"),
                  icon: <EditOutlined />,
                  disabled: !onEdit || removing,
                  onClick: () => onEdit?.(record),
                },
                {
                  key: "resync",
                  label: t("resync"),
                  icon: <SyncOutlined />,
                  disabled: !onResync || removing,
                  onClick: () => onResync?.(record),
                },
                { type: "divider" },
                {
                  key: "remove",
                  label: t("remove"),
                  icon: <DeleteOutlined />,
                  danger: true,
                  disabled: !onRemove || removing,
                  onClick: () => onRemove?.(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
