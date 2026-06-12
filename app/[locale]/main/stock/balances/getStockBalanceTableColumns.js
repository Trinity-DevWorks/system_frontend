import { formatStockDateTime } from "../shared/formatStockDateTime";
import { formatStockQuantity, formatUomLabel } from "../shared/formatStockQuantity";
import { EditOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import dayjs from "dayjs";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{ onAdjust?: (record: unknown) => void }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getStockBalanceTableColumns(t, actions = {}) {
  const { onAdjust } = actions;

  return [
    {
      title: t("colItemSku"),
      key: "item_sku",
      width: 120,
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
      width: 220,
      ellipsis: true,
      render: (_v, record) => record?.item?.name ?? "—",
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 180,
      ellipsis: true,
      render: (_v, record) => {
        const w = record?.warehouse;
        if (!w) return "—";
        const shortcut = typeof w.shortcut_name === "string" ? w.shortcut_name.trim() : "";
        const name = typeof w.name === "string" ? w.name : "";
        return shortcut ? `${shortcut} — ${name}` : name || "—";
      },
    },
    {
      title: t("colQuantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      align: "right",
      sorter: (a, b) => Number(a.quantity) - Number(b.quantity),
      render: (value) => (
        <Typography.Text strong>{formatStockQuantity(value)}</Typography.Text>
      ),
    },
    {
      title: t("colBaseUom"),
      key: "base_uom",
      width: 140,
      ellipsis: true,
      render: (_v, record) => formatUomLabel(record?.item?.base_uom) || "—",
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 200,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => formatStockDateTime(value) || "\u2014",
    },
    ...(onAdjust
      ? [
          {
            title: t("colActions"),
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_v, record) => (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onAdjust(record)}
              >
                {t("actionAdjust")}
              </Button>
            ),
          },
        ]
      : []),
  ];
}
