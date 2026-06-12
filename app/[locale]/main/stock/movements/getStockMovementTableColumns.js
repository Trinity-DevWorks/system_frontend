import { formatStockDateTime } from "../shared/formatStockDateTime";
import { formatStockQuantity, formatUomLabel } from "../shared/formatStockQuantity";
import { getStockMovementTypeLabel } from "../shared/stockMovementTypes";
import { Typography } from "antd";
import dayjs from "dayjs";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @returns {import("antd").TableProps["columns"]}
 */
export function getStockMovementTableColumns(t) {
  return [
    {
      title: t("colMovementDate"),
      dataIndex: "created_at",
      key: "created_at",
      width: 200,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => {
        const label = formatStockDateTime(value);
        return label ? label : <Typography.Text type="secondary">{"\u2014"}</Typography.Text>;
      },
    },
    {
      title: t("colMovementType"),
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (value) => getStockMovementTypeLabel(t, value),
    },
    {
      title: t("colItemSku"),
      key: "item_sku",
      width: 110,
      ellipsis: true,
      render: (_v, record) => {
        const sku = record?.item?.sku;
        return typeof sku === "string" && sku.trim() ? (
          <Typography.Text code className="text-xs">
            {sku}
          </Typography.Text>
        ) : (
          "—"
        );
      },
    },
    {
      title: t("colItemName"),
      key: "item_name",
      width: 180,
      ellipsis: true,
      render: (_v, record) => record?.item?.name ?? "—",
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 160,
      ellipsis: true,
      render: (_v, record) => record?.warehouse?.name ?? "—",
    },
    {
      title: t("colQuantityDelta"),
      dataIndex: "quantity_delta",
      key: "quantity_delta",
      width: 110,
      align: "right",
      render: (value) => {
        const n = Number(value);
        const formatted = formatStockQuantity(value);
        if (Number.isFinite(n) && n < 0) {
          return <Typography.Text type="danger">{formatted}</Typography.Text>;
        }
        if (Number.isFinite(n) && n > 0) {
          return <Typography.Text type="success">+{formatted}</Typography.Text>;
        }
        return formatted;
      },
    },
    {
      title: t("colQuantityOnHand"),
      dataIndex: "quantity_on_hand",
      key: "quantity_on_hand",
      width: 110,
      align: "right",
      render: (value) =>
        value != null ? formatStockQuantity(value) : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: t("colLineUom"),
      key: "line_uom",
      width: 120,
      ellipsis: true,
      render: (_v, record) => formatUomLabel(record?.item_uom?.uom) || "—",
    },
    {
      title: t("colUser"),
      key: "user",
      width: 140,
      ellipsis: true,
      render: (_v, record) => record?.user?.name ?? "—",
    },
    {
      title: t("colNotes"),
      dataIndex: "notes",
      key: "notes",
      width: 200,
      ellipsis: true,
      render: (value) => (typeof value === "string" && value.trim() ? value : "—"),
    },
  ];
}
