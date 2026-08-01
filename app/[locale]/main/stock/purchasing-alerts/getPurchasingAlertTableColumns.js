import { formatStockQuantity, formatUomLabel } from "../shared/formatStockQuantity";
import { FileAddOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag } from "antd";

/** @type {Record<string, string>} */
const STATUS_TAG_COLOR = {
  out_of_stock: "error",
  below_safety: "warning",
  below_reorder: "gold",
  ok: "success",
};

/**
 * @param {(key: string) => string} t
 * @param {{ onCreatePo?: (record: Record<string, unknown>) => void }} [handlers]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getPurchasingAlertTableColumns(t, handlers = {}) {
  const { onCreatePo } = handlers;
  return [
    {
      title: t("colItemSku"),
      key: "item_sku",
      width: 120,
      ellipsis: true,
      render: (_v, record) => record?.item?.sku ?? "—",
    },
    {
      title: t("colItemName"),
      key: "item_name",
      width: 200,
      ellipsis: true,
      render: (_v, record) => record?.item?.name ?? "—",
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 160,
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
      title: t("colAlertStatus"),
      key: "status",
      width: 130,
      render: (_v, record) => {
        const status = typeof record?.status === "string" ? record.status : "";
        if (!status) return "—";
        return (
          <Tag color={STATUS_TAG_COLOR[status] ?? "default"} className="!m-0">
            {t(`alertStatus_${status}`)}
          </Tag>
        );
      },
    },
    {
      title: t("colOnHand"),
      key: "on_hand",
      width: 100,
      align: "right",
      sorter: (a, b) => Number(a.on_hand_qty) - Number(b.on_hand_qty),
      render: (_v, record) => formatStockQuantity(record?.on_hand_qty),
    },
    {
      title: t("colSafetyStock"),
      key: "safety_stock",
      width: 120,
      align: "right",
      render: (_v, record) => formatStockQuantity(record?.safety_stock_qty),
    },
    {
      title: t("colReorderPoint"),
      key: "reorder_point",
      width: 110,
      align: "right",
      render: (_v, record) => formatStockQuantity(record?.reorder_point_qty),
    },
    {
      title: t("colSuggestedOrder"),
      key: "suggested_order",
      width: 140,
      align: "right",
      render: (_v, record) => formatStockQuantity(record?.suggested_order_qty),
    },
    {
      title: t("colBaseUom"),
      key: "base_uom",
      width: 100,
      ellipsis: true,
      render: (_v, record) => formatUomLabel(record?.item?.base_uom) || "—",
    },
    {
      title: t("colReplenishmentMethod"),
      key: "method",
      width: 120,
      render: (_v, record) => {
        const method = record?.replenishment_method;
        if (method === "min_max") return t("replenishmentMethodMinMax");
        if (method === "reorder_point") return t("replenishmentMethodReorderPoint");
        return "—";
      },
    },
    {
      title: t("colPreferredSupplier"),
      key: "preferred_supplier",
      width: 160,
      ellipsis: true,
      render: (_v, record) => record?.preferred_supplier?.name ?? "—",
    },
    {
      title: t("colLeadTime"),
      key: "lead_time",
      width: 90,
      align: "right",
      render: (_v, record) =>
        record?.lead_time_days != null ? t("leadTimeDays", { days: record.lead_time_days }) : "—",
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_v, record) => {
        const suggestedQty = Number(record?.suggested_order_qty);
        const canCreate = Number.isFinite(suggestedQty) && suggestedQty > 0;

        const items = [
          {
            key: "create-po",
            icon: <FileAddOutlined />,
            label: t("actionCreatePoFromAlert"),
            disabled: !canCreate,
            onClick: () => onCreatePo?.(record),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
