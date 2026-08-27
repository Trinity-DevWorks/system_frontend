import { EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import { Button, Dropdown, Typography } from "antd";
import dayjs from "dayjs";
import { formatStockQuantity, formatUomLabel } from "../../utils/formatStockQuantity";
import { getStockMovementTypeLabel } from "../../utils/stockMovementTypes";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getStockMovementTableColumns(t, actions = {}) {
  const { onView } = actions;

  return [
    {
      title: t("colMovementDate"),
      dataIndex: "created_at",
      key: "created_at",
      width: 200,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => {
        const label = formatTenantDateTime(value);
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
      title: t("colItemCode"),
      key: "item_code",
      width: 110,
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
      title: t("colLot"),
      key: "lot",
      width: 130,
      ellipsis: true,
      render: (_v, record) => record?.lot?.lot_number ?? "—",
    },
    {
      title: t("colExpiry"),
      key: "expiry",
      width: 130,
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
      title: t("colUnitCost"),
      dataIndex: "unit_cost",
      key: "unit_cost",
      width: 120,
      align: "right",
      render: (value) => formatTenantMoney(value) || "—",
    },
    {
      title: t("colValueDelta"),
      dataIndex: "value_delta",
      key: "value_delta",
      width: 130,
      align: "right",
      render: (value) => {
        const n = Number(value);
        const formatted = formatTenantMoney(value) || "—";
        if (Number.isFinite(n) && n < 0) {
          return <Typography.Text type="danger">{formatted}</Typography.Text>;
        }
        if (Number.isFinite(n) && n > 0) {
          return <Typography.Text type="success">{formatted}</Typography.Text>;
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
    ...(onView
      ? [
          {
            title: t("colActions"),
            key: "actions",
            width: 72,
            fixed: "right",
            render: (_, record) => {
              const items = [
                {
                  key: "view",
                  icon: <EyeOutlined />,
                  label: t("actionView"),
                  onClick: () => onView(record),
                },
              ];

              return (
                <Dropdown menu={{ items }} trigger={["click"]}>
                  <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
                </Dropdown>
              );
            },
          },
        ]
      : []),
  ];
}
