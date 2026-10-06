import {
  getPurchaseInvoiceSettlementLabel,
  getPurchaseInvoiceStatusLabel,
  isPurchaseInvoiceDraft,
  purchaseInvoiceCanReissue,
  purchaseInvoiceCanReverse,
  purchaseInvoiceReissueDisabledReason,
  purchaseInvoiceReverseDisabledReason,
  purchaseInvoiceSettlement,
  purchaseInvoiceStatusTagColor,
} from "../../utils/purchaseInvoiceStatuses";
import InvoiceChainStatusTag from "@/features/sales-invoices/components/InvoiceChainStatusTag";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onPost?: (record: unknown) => void;
 *   onReverse?: (record: unknown) => void;
 *   onReissue?: (record: unknown) => void;
 *   showChainStatus?: boolean;
 *   onRefreshProof?: (record: unknown) => void;
 *   onApproveProof?: (record: unknown) => void;
 *   onSupplierLink?: (record: unknown) => void;
 *   onShareProof?: (record: unknown) => void;
 * }} [actions]
 */
export function getPurchaseInvoiceTableColumns(t, actions = {}) {
  const {
    onView,
    onEdit,
    onDelete,
    onPost,
    onReverse,
    onReissue,
    showChainStatus = false,
    onRefreshProof,
    onApproveProof,
    onSupplierLink,
    onShareProof,
  } = actions;

  /** @param {Record<string, any>} record */
  const proofItems = (record) => {
    if (!showChainStatus) return [];
    if (record?.status === "reversed") {
      return onRefreshProof
        ? [
            { type: "divider" },
            {
              key: "proof-refresh",
              icon: <ReloadOutlined />,
              label: t("actionVerify"),
              onClick: () => onRefreshProof(record),
            },
          ]
        : [];
    }
    if (record?.status !== "posted") return [];
    const items = [];
    if (onRefreshProof) {
      items.push({
        key: "proof-refresh",
        icon: <ReloadOutlined />,
        label: t("actionVerify"),
        onClick: () => onRefreshProof(record),
      });
    }
    if (onApproveProof && record?.chain_status?.status === "waiting_buyer") {
      items.push({
        key: "proof-approve",
        icon: <CheckCircleOutlined />,
        label: t("actionApproveAsBuyer"),
        onClick: () => onApproveProof(record),
      });
    }
    if (onSupplierLink && !record?.linked_proof_id) {
      items.push({
        key: "proof-supplier-link",
        icon: <QrcodeOutlined />,
        label: t("actionSupplierLink"),
        onClick: () => onSupplierLink(record),
      });
    }
    if (onShareProof && !record?.linked_proof_id) {
      const shareBlocked = record?.chain_status?.status === "tampered";
      items.push({
        key: "proof-share",
        icon: <ShareAltOutlined />,
        disabled: shareBlocked,
        title: shareBlocked ? t("shareProofDisabledTampered") : undefined,
        label: t("actionShareProof"),
        onClick: () => onShareProof(record),
      });
    }
    return items.length > 0 ? [{ type: "divider" }, ...items] : [];
  };

  return [
    {
      title: t("colNumber"),
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 140,
      ellipsis: true,
      sorter: (a, b) => String(a.invoice_number ?? "").localeCompare(String(b.invoice_number ?? "")),
      render: (value) =>
        value ? (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ) : (
          "\u2014"
        ),
    },
    {
      title: t("colDate"),
      dataIndex: "invoice_date",
      key: "invoice_date",
      width: 120,
      sorter: (a, b) => toTime(a.invoice_date) - toTime(b.invoice_date),
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    {
      title: t("colSupplier"),
      dataIndex: "supplier_name",
      key: "supplier_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("colGrn"),
      key: "goods_receipt",
      width: 120,
      ellipsis: true,
      render: (_, record) => record?.goods_receipt?.grn_number || "\u2014",
    },
    {
      title: t("colPurchaseOrder"),
      key: "purchase_order",
      width: 130,
      ellipsis: true,
      render: (_, record) => record?.purchase_order?.po_number || "\u2014",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 200,
      sorter: (a, b) => String(a.status ?? "").localeCompare(String(b.status ?? "")),
      render: (value, record) => {
        const settlement = purchaseInvoiceSettlement(value, record?.paid_total, record?.net_to_pay);
        return (
          <span className="inline-flex flex-wrap gap-1">
            <Tag color={purchaseInvoiceStatusTagColor(value)}>{getPurchaseInvoiceStatusLabel(t, value)}</Tag>
            {settlement ? (
              <Tag color={settlement === "paid" ? "success" : settlement === "partial" ? "warning" : "default"}>
                {getPurchaseInvoiceSettlementLabel(t, settlement)}
              </Tag>
            ) : null}
          </span>
        );
      },
    },
    ...(showChainStatus
      ? [
          {
            title: t("colBlockchain"),
            key: "chain_status",
            width: 150,
            render: (_, record) =>
              record?.linked_proof_id && !record?.chain_status?.status ? (
                <Tag>{t("chainStatusLinked")}</Tag>
              ) : (
                <InvoiceChainStatusTag variant="purchase" status={record?.chain_status} issue={record?.chain_issue} />
              ),
          },
        ]
      : []),
    {
      title: t("colTotal"),
      dataIndex: "grand_total",
      key: "grand_total",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.grand_total ?? 0) - Number(b.grand_total ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colPaidTotal"),
      dataIndex: "paid_total",
      key: "paid_total",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.paid_total ?? 0) - Number(b.paid_total ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colNetToPay"),
      dataIndex: "net_to_pay",
      key: "net_to_pay",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.net_to_pay ?? 0) - Number(b.net_to_pay ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => formatTenantDateTime(value) || "\u2014",
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_, record) => {
        const isDraft = isPurchaseInvoiceDraft(record?.status);
        const items = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: t("actionView"),
            onClick: () => onView?.(record),
          },
          ...(isDraft
            ? [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: t("actionEdit"),
                  onClick: () => onEdit?.(record),
                },
                ...(onPost
                  ? [
                      {
                        key: "post",
                        icon: <SendOutlined />,
                        label: t("actionPost"),
                        onClick: () => onPost(record),
                      },
                    ]
                  : []),
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  danger: true,
                  label: t("actionDelete"),
                  onClick: () => onDelete?.(record),
                },
              ]
            : []),
          ...(onReverse && record?.status === "posted"
            ? [
                {
                  key: "reverse",
                  icon: <RollbackOutlined />,
                  danger: true,
                  label: t("actionReverse"),
                  disabled: !purchaseInvoiceCanReverse(record),
                  title: purchaseInvoiceReverseDisabledReason(t, record) || undefined,
                  onClick: () => {
                    if (purchaseInvoiceCanReverse(record)) onReverse(record);
                  },
                },
              ]
            : []),
          ...(onReissue && (record?.status === "reversed" || (record?.status === "posted" && onReverse))
            ? [
                {
                  key: "reissue",
                  icon: <CopyOutlined />,
                  label: t("actionReissue"),
                  disabled: !purchaseInvoiceCanReissue(record),
                  title: purchaseInvoiceReissueDisabledReason(t, record) || undefined,
                  onClick: () => {
                    if (purchaseInvoiceCanReissue(record)) onReissue(record);
                  },
                },
              ]
            : []),
          ...proofItems(record),
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={t("actionMenu")}
              onClick={(event) => event.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];
}
