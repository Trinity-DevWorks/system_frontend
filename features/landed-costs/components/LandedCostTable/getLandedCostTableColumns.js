"use client";

import { formatTenantDate } from "@/lib/tenant-format";
import { documentActionsColumn, renderDocumentStatus } from "@/shared/components/tables/treasuryDocumentActions";
import { PrinterOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import { landedCostMoney } from "../../utils/landedCostDrawerUtils";

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: Record<string, any>) => void;
 *   onEdit?: (record: Record<string, any>) => void;
 *   onDelete?: (record: Record<string, any>) => void;
 *   onPost?: (record: Record<string, any>) => void;
 *   onReverse?: (record: Record<string, any>) => void;
 *   onPrint?: (record: Record<string, any>) => void;
 * }} actions
 */
export function getLandedCostTableColumns(t, actions) {
  const { onView, onEdit, onDelete, onPost, onReverse, onPrint } = actions;
  return [
    {
      title: t("colNumber"),
      dataIndex: "landed_cost_number",
      key: "landed_cost_number",
      width: 200,
      render: (v) => (v ? <Typography.Text code className="text-xs">{v}</Typography.Text> : "—"),
    },
    { title: t("colDate"), dataIndex: "cost_date", key: "cost_date", width: 120, render: (v) => formatTenantDate(v) || "—" },
    { title: t("colReference"), dataIndex: "reference", key: "reference", width: 180, ellipsis: true, render: (v) => v || "—" },
    { title: t("colReceipts"), dataIndex: "receipts_count", key: "receipts_count", width: 110, align: "right" },
    { title: t("colTotal"), dataIndex: "total_amount", key: "total_amount", width: 140, align: "right", render: landedCostMoney },
    { title: t("colStatus"), dataIndex: "status", key: "status", width: 110, render: (v) => renderDocumentStatus(v, t) },
    documentActionsColumn(t, {
      onView,
      onEdit,
      onDelete,
      onPost,
      onReverse,
      extra: (record) => [
        {
          key: "print",
          label: t("actionPrint"),
          icon: <PrinterOutlined />,
          disabled: !onPrint || record?.status === "draft",
          onClick: () => onPrint?.(record),
        },
      ],
    }),
  ];
}
