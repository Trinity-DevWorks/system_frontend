import { DeleteOutlined, DropboxOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, MailOutlined, MoreOutlined, PrinterOutlined, StopOutlined } from "@ant-design/icons";
import {
  getPurchaseOrderStatusLabel,
  isPurchaseOrderCancellable,
  isPurchaseOrderConfirmed,
  isPurchaseOrderPrintable,
  isPurchaseOrderReceivable,
  purchaseOrderStatusTagColor,
} from "../../utils/purchaseOrderStatuses";
import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Button, Dropdown, Tag, Typography } from "antd";

/**
 * Purchase order list columns, same layout as the sales order list.
 *
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onCancel?: (record: unknown) => void;
 *   onPrint?: (record: unknown) => void;
 *   onDownloadPdf?: (record: unknown) => void;
 *   onMarkSent?: (record: unknown) => void;
 *   onReceive?: (record: unknown) => void;
 * }} [actions]
 */
export function getPurchaseOrderTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onCancel, onPrint, onDownloadPdf, onMarkSent, onReceive } = actions;

  return [
    {
      title: t("colPoNumber"),
      dataIndex: "po_number",
      key: "number",
      width: 140,
      render: (value) => (value ? <Typography.Text code>{value}</Typography.Text> : "\u2014"),
    },
    {
      title: t("colOrderDate"),
      dataIndex: "order_date",
      key: "date",
      width: 130,
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    {
      title: t("colExpectedDate"),
      dataIndex: "expected_date",
      key: "extra",
      width: 130,
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    { title: t("colSupplier"), dataIndex: "supplier_name", key: "supplier", ellipsis: true },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value) => <Tag color={purchaseOrderStatusTagColor(value)}>{getPurchaseOrderStatusLabel(t, value)}</Tag>,
    },
    {
      title: t("colPoGrandTotal"),
      dataIndex: "grand_total",
      key: "total",
      width: 150,
      align: "right",
      render: (value, record) =>
        formatTenantMoneyWithSymbol(value, record?.currency?.symbol ?? record?.currency_code) || "\u2014",
    },
    {
      title: "",
      key: "actions",
      width: 64,
      render: (_, record) => {
        const status = record?.status;
        const isDraft = status === "draft";
        const items = [
          onView ? { key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => onView(record) } : null,
          onEdit && isDraft
            ? { key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => onEdit(record) }
            : null,
          onPrint && isPurchaseOrderPrintable(status)
            ? { key: "print", icon: <PrinterOutlined />, label: t("actionPrint"), onClick: () => onPrint(record) }
            : null,
          onDownloadPdf && isPurchaseOrderPrintable(status)
            ? { key: "pdf", icon: <FilePdfOutlined />, label: t("actionDownloadPdf"), onClick: () => onDownloadPdf(record) }
            : null,
          onMarkSent && isPurchaseOrderConfirmed(status)
            ? { key: "mark-sent", icon: <MailOutlined />, label: t("actionMarkPoSent"), onClick: () => onMarkSent(record) }
            : null,
          onReceive && isPurchaseOrderReceivable(status)
            ? { key: "receive", icon: <DropboxOutlined />, label: t("actionReceiveGoods"), onClick: () => onReceive(record) }
            : null,
          onCancel && !isDraft && isPurchaseOrderCancellable(status)
            ? { key: "cancel", icon: <StopOutlined />, danger: true, label: t("actionCancelPo"), onClick: () => onCancel(record) }
            : null,
          onDelete && isDraft
            ? { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("actionDelete"), onClick: () => onDelete(record) }
            : null,
        ].filter(Boolean);

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
