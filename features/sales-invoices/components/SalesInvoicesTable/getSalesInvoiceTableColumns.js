import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileSyncOutlined,
  MoreOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import {
  getSalesInvoiceSettlementLabel,
  getSalesInvoiceStatusLabel,
  isSalesInvoiceDraft,
  salesInvoiceCanCreditNote,
  salesInvoiceCanReissue,
  salesInvoiceCanReverse,
  salesInvoiceCreditNoteDisabledReason,
  salesInvoiceReissueDisabledReason,
  salesInvoiceReverseDisabledReason,
  salesInvoiceSettlement,
  salesInvoiceStatusTagColor,
} from "../../utils/salesInvoiceStatuses";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import InvoiceChainStatusTag from "../InvoiceChainStatusTag";
import { shareProofBlockReason } from "../../utils/invoiceProofStatuses";
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
 *   onCreditNote?: (record: unknown) => void;
 *   canAddCreditNote?: boolean;
 *   showChainStatus?: boolean;
 *   onRefreshProof?: (record: unknown) => void;
 *   onApproveProof?: (record: unknown) => void;
 *   onBuyerLink?: (record: unknown) => void;
 *   onShareProof?: (record: unknown) => void;
 * }} [actions]
 */
export function getSalesInvoiceTableColumns(t, actions = {}) {
  const {
    onView,
    onEdit,
    onDelete,
    onPost,
    onReverse,
    onReissue,
    onCreditNote,
    canAddCreditNote = true,
    showChainStatus = false,
    onRefreshProof,
    onApproveProof,
    onBuyerLink,
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
    if (onApproveProof && record?.chain_status?.status === "waiting_company") {
      items.push({
        key: "proof-approve",
        icon: <CheckCircleOutlined />,
        label: t("actionApproveAsCompany"),
        onClick: () => onApproveProof(record),
      });
    }
    if (onBuyerLink) {
      items.push({
        key: "proof-buyer-link",
        icon: <QrcodeOutlined />,
        label: t("actionBuyerLink"),
        onClick: () => onBuyerLink(record),
      });
    }
    if (onShareProof) {
      const shareBlockedReason = shareProofBlockReason(t, record?.chain_status?.status);
      items.push({
        key: "proof-share",
        icon: <ShareAltOutlined />,
        disabled: shareBlockedReason != null,
        title: shareBlockedReason ?? undefined,
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
      title: t("colCustomer"),
      dataIndex: "customer_name",
      key: "customer_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 200,
      sorter: (a, b) => String(a.status ?? "").localeCompare(String(b.status ?? "")),
      render: (value, record) => {
        const settlement = salesInvoiceSettlement(value, record?.paid_total, record?.net_to_pay);
        return (
          <span className="inline-flex flex-wrap gap-1">
            <Tag color={salesInvoiceStatusTagColor(value)} className="!m-0">
              {getSalesInvoiceStatusLabel(t, value)}
            </Tag>
            {settlement ? (
              <Tag color={settlement === "paid" ? "success" : settlement === "partial" ? "warning" : "default"} className="!m-0">
                {getSalesInvoiceSettlementLabel(t, settlement)}
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
            width: 170,
            render: (_, record) => (
              <InvoiceChainStatusTag status={record?.chain_status} issue={record?.chain_issue} />
            ),
          },
        ]
      : []),
    {
      title: t("colGrandTotal"),
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
        const isDraft = isSalesInvoiceDraft(record?.status);
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
                  disabled: !salesInvoiceCanReverse(record),
                  title: salesInvoiceReverseDisabledReason(t, record) || undefined,
                  onClick: () => {
                    if (salesInvoiceCanReverse(record)) onReverse(record);
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
                  disabled: !salesInvoiceCanReissue(record),
                  title: salesInvoiceReissueDisabledReason(t, record) || undefined,
                  onClick: () => {
                    if (salesInvoiceCanReissue(record)) onReissue(record);
                  },
                },
              ]
            : []),
          {
            key: "credit-note",
            icon: <FileSyncOutlined />,
            label: t("actionCreditNote"),
            disabled: !salesInvoiceCanCreditNote(record, canAddCreditNote),
            title: salesInvoiceCreditNoteDisabledReason(t, record, canAddCreditNote) || undefined,
            onClick: () => {
              if (salesInvoiceCanCreditNote(record, canAddCreditNote)) onCreditNote?.(record);
            },
          },
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
