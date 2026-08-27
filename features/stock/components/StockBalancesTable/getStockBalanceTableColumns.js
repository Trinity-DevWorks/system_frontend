import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import { formatStockQuantity, formatUomLabel } from "../../utils/formatStockQuantity";
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
      title: t("colItemCode"),
      key: "item_code",
      width: 120,
      ellipsis: true,
      render: (_v, record) => {
        const code = record?.item?.item_code;
        return typeof code === "string" && code.trim() ? (
          <Typography.Text code className="text-xs">
            {code}
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
      title: t("colLot"),
      key: "lot",
      width: 140,
      ellipsis: true,
      render: (_v, record) => record?.lot?.lot_number ?? "—",
    },
    {
      title: t("colExpiry"),
      key: "expiry",
      width: 140,
      render: (_v, record) => {
        const expiry = record?.lot?.expiry_date;
        if (!expiry) return "—";
        const label = formatTenantDate(expiry) || expiry;
        if (record?.lot?.is_expired) {
          return <Typography.Text type="danger">{label} · {t("lotExpired")}</Typography.Text>;
        }
        return label;
      },
    },
    {
      title: t("colQuantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 110,
      align: "right",
      sorter: (a, b) => Number(a.quantity) - Number(b.quantity),
      render: (value) => (
        <Typography.Text strong>{formatStockQuantity(value)}</Typography.Text>
      ),
    },
    {
      title: t("colOnOrder"),
      dataIndex: "on_order_qty",
      key: "on_order_qty",
      width: 110,
      align: "right",
      render: (value) => formatStockQuantity(value),
    },
    {
      title: t("colInTransitIn"),
      dataIndex: "in_transit_in_qty",
      key: "in_transit_in_qty",
      width: 120,
      align: "right",
      render: (value) => formatStockQuantity(value),
    },
    {
      title: t("colInTransitOut"),
      dataIndex: "in_transit_out_qty",
      key: "in_transit_out_qty",
      width: 130,
      align: "right",
      render: (value) => formatStockQuantity(value),
    },
    {
      title: t("colProjected"),
      dataIndex: "projected_qty",
      key: "projected_qty",
      width: 110,
      align: "right",
      render: (value) => formatStockQuantity(value),
    },
    {
      title: t("colUnitCost"),
      dataIndex: "unit_cost",
      key: "unit_cost",
      width: 120,
      align: "right",
      render: (value) => formatTenantMoney(value) || "—",
    },
    {
      title: t("colInventoryValue"),
      dataIndex: "inventory_value",
      key: "inventory_value",
      width: 140,
      align: "right",
      render: (value) => formatTenantMoney(value) || "—",
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
      render: (value) => formatTenantDateTime(value) || "\u2014",
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
