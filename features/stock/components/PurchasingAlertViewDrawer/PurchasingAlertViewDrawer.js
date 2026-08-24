"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Read-only purchasing alert detail drawer (URL: ?drawer=<replenishment_id>&mode=view).
 *
 * Used by:
 * - app/[locale]/main/stock/purchasing-alerts/page.js
 */

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { PURCHASING_ALERT_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { normalizeEntityId } from "@/lib/entityId";
import { fetchPurchasingAlert } from "../../api/purchasingAlerts.api";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Descriptions, Space, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatStockQuantity, formatUomLabel } from "../../utils/formatStockQuantity";

/** @type {Record<string, string>} */
const STATUS_TAG_COLOR = {
  out_of_stock: "error",
  below_safety: "warning",
  below_reorder: "gold",
  ok: "success",
};

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @param {number | string | null | undefined} replenishmentId
 */
function seedMatchesReplenishment(record, replenishmentId) {
  if (!record || typeof record !== "object" || replenishmentId == null) return false;
  const seedId = record.replenishment_id ?? record.id;
  return normalizeEntityId(seedId) === normalizeEntityId(replenishmentId);
}

/**
 * @param {{
 *   open: boolean;
 *   replenishmentId: number | string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreatePo?: (record: Record<string, unknown>) => void;
 *   canCreatePo?: boolean;
 * }} props
 */
export default function PurchasingAlertViewDrawer({
  open,
  replenishmentId,
  tableSeedRecord = null,
  onClose,
  onCreatePo,
  canCreatePo = false,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { modal } = App.useApp();

  const detailEnabled = open && replenishmentId != null;
  const seedMatches = seedMatchesReplenishment(tableSeedRecord, replenishmentId);

  const detailQuery = useQuery({
    queryKey: [...PURCHASING_ALERT_DETAIL_QUERY_PREFIX, replenishmentId],
    queryFn: () => fetchPurchasingAlert(/** @type {number | string} */ (replenishmentId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
    placeholderData: seedMatches ? tableSeedRecord ?? undefined : undefined,
  });

  const record = detailQuery.data ?? null;

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly: true,
    modal,
    t,
    onClose,
    shouldConfirmDiscard: () => false,
  });

  const recordName = useMemo(() => {
    const code = record?.item?.item_code;
    if (typeof code === "string" && code.trim()) return code;
    const name = record?.item?.name;
    return typeof name === "string" && name.trim() ? name : null;
  }, [record]);

  const canCreateFromRecord = useMemo(() => {
    if (!canCreatePo || !record || !onCreatePo) return false;
    const suggestedQty = Number(record.suggested_order_qty);
    return Number.isFinite(suggestedQty) && suggestedQty > 0;
  }, [canCreatePo, onCreatePo, record]);

  const warehouseLabel = useMemo(() => {
    const w = record?.warehouse;
    if (!w || typeof w !== "object") return "—";
    const shortcut = typeof w.shortcut_name === "string" ? w.shortcut_name.trim() : "";
    const name = typeof w.name === "string" ? w.name : "";
    return shortcut ? `${shortcut} — ${name}` : name || "—";
  }, [record]);

  const methodLabel = useMemo(() => {
    const method = record?.replenishment_method;
    if (method === "min_max") return t("replenishmentMethodMinMax");
    if (method === "reorder_point") return t("replenishmentMethodReorderPoint");
    return "—";
  }, [record, t]);

  const status = typeof record?.status === "string" ? record.status : "";

  return (
    <ResourceCrudDrawer
      title={t("purchasingAlertViewDrawerTitle")}
      recordName={recordName}
      open={open}
      requestClose={requestClose}
      submitting={false}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Space wrap>
            <Button onClick={forceClose}>{t("drawerClose")}</Button>
            {canCreateFromRecord ? (
              <Button
                type="primary"
                onClick={() => onCreatePo?.(/** @type {Record<string, unknown>} */ (record))}
              >
                {t("actionCreatePoFromAlert")}
              </Button>
            ) : null}
          </Space>
        </div>
      }
      showDetailLoading={detailEnabled && detailQuery.isPending && !record}
      detailLoadFailed={detailEnabled && detailQuery.isError}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={480}
    >
      {record ? (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t("colItemCode")}>
            {typeof record?.item?.item_code === "string" && record.item.item_code.trim() ? (
              <Typography.Text code className="text-xs">
                {record.item.item_code}
              </Typography.Text>
            ) : (
              "—"
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("colItemName")}>{record?.item?.name ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("colWarehouse")}>{warehouseLabel}</Descriptions.Item>
          <Descriptions.Item label={t("colAlertStatus")}>
            {status ? (
              <Tag color={STATUS_TAG_COLOR[status] ?? "default"} className="!m-0">
                {t(`alertStatus_${status}`)}
              </Tag>
            ) : (
              "—"
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("colOnHand")}>
            {formatStockQuantity(record.on_hand_qty)}
          </Descriptions.Item>
          <Descriptions.Item label={t("colSafetyStock")}>
            {formatStockQuantity(record.safety_stock_qty)}
          </Descriptions.Item>
          <Descriptions.Item label={t("colReorderPoint")}>
            {formatStockQuantity(record.reorder_point_qty)}
          </Descriptions.Item>
          <Descriptions.Item label={t("colSuggestedOrder")}>
            {formatStockQuantity(record.suggested_order_qty)}
          </Descriptions.Item>
          <Descriptions.Item label={t("colBaseUom")}>
            {formatUomLabel(record?.item?.base_uom) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colReplenishmentMethod")}>{methodLabel}</Descriptions.Item>
          <Descriptions.Item label={t("colPreferredSupplier")}>
            {record?.preferred_supplier?.name ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colLeadTime")}>
            {record?.lead_time_days != null
              ? t("leadTimeDays", { days: record.lead_time_days })
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </ResourceCrudDrawer>
  );
}
