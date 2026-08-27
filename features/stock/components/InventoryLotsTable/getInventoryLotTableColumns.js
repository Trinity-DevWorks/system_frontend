import { dayjsDatePattern, formatTenantDate } from "@/lib/tenant-format";
import { formatStockQuantity } from "../../utils/formatStockQuantity";
import { DatePicker, Typography } from "antd";
import dayjs from "dayjs";

/**
 * @param {unknown} value
 */
function expiryPickerValue(value) {
  if (value == null || value === "") return undefined;
  const parsed = dayjs.isDayjs(value) ? value : dayjs(value);
  return parsed.isValid() ? parsed : undefined;
}

/**
 * @param {Record<string, unknown> | null | undefined} item
 */
function itemLabel(item) {
  const name = typeof item?.name === "string" && item.name.trim() ? item.name : "";
  const code = typeof item?.item_code === "string" && item.item_code.trim() ? item.item_code : "";
  if (code && name) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Typography.Text code className="text-xs">
          {code}
        </Typography.Text>
        <span className="truncate">{name}</span>
      </span>
    );
  }
  return name || code || "—";
}

/**
 * @param {Record<string, unknown> | null | undefined} warehouse
 */
function warehouseLabel(warehouse) {
  if (!warehouse) return "—";
  const shortcut = typeof warehouse.shortcut_name === "string" ? warehouse.shortcut_name.trim() : "";
  const name = typeof warehouse.name === "string" ? warehouse.name : "";
  return shortcut ? `${shortcut} — ${name}` : name || "—";
}

/**
 * @param {(key: string) => string} t
 * @param {{
 *   canEdit?: boolean;
 *   savingId?: number | string | null;
 *   onExpiryChange?: (record: Record<string, unknown>, expiryDate: string | null) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getInventoryLotTableColumns(t, actions = {}) {
  const { canEdit = false, savingId = null, onExpiryChange } = actions;

  return [
    {
      title: t("colLot"),
      dataIndex: "lot_number",
      key: "lot_number",
      width: 160,
      ellipsis: true,
      render: (value) => value || "—",
    },
    {
      title: t("colItemName"),
      key: "item",
      width: 260,
      ellipsis: true,
      render: (_v, record) => itemLabel(record?.item),
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 200,
      ellipsis: true,
      render: (_v, record) => warehouseLabel(record?.warehouse),
    },
    {
      title: t("colQuantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 110,
      align: "right",
      render: (value) => <Typography.Text strong>{formatStockQuantity(value)}</Typography.Text>,
    },
    {
      title: t("colExpiry"),
      key: "expiry",
      width: 180,
      render: (_v, record) => {
        if (canEdit && onExpiryChange) {
          return (
            <DatePicker
              className="w-full"
              size="small"
              allowClear
              placeholder={t("lotExpiryPlaceholder")}
              format={dayjsDatePattern()}
              value={expiryPickerValue(record?.expiry_date)}
              disabled={savingId != null && Number(savingId) === Number(record?.id)}
              onChange={(date) => {
                const next = date ? date.format("YYYY-MM-DD") : null;
                const current =
                  typeof record?.expiry_date === "string" && record.expiry_date ? record.expiry_date : null;
                if (next === current) return;
                onExpiryChange(record, next);
              }}
            />
          );
        }
        const expiry = record?.expiry_date;
        if (!expiry) return "—";
        return formatTenantDate(expiry) || expiry;
      },
    },
    {
      title: t("lotExpired"),
      key: "expired",
      width: 110,
      render: (_v, record) =>
        record?.is_expired ? <Typography.Text type="danger">{t("lotExpired")}</Typography.Text> : "—",
    },
  ];
}
