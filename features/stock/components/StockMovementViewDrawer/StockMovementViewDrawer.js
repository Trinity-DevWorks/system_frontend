"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Read-only stock movement / adjustment detail drawer.
 *
 * Used by:
 * - app/[locale]/main/stock/movements/page.js
 */

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { STOCK_MOVEMENT_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { normalizeEntityId } from "@/lib/entityId";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import { fetchStockMovement } from "../../api/stock.api";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Descriptions, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatStockQuantity, formatUomLabel } from "../../utils/formatStockQuantity";
import { getStockMovementTypeLabel } from "../../utils/stockMovementTypes";

/**
 * @param {{
 *   open: boolean;
 *   movementId: number | string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function StockMovementViewDrawer({
  open,
  movementId,
  tableSeedRecord = null,
  onClose,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { modal } = App.useApp();

  const detailEnabled = open && movementId != null;
  const seedMatches =
    tableSeedRecord != null &&
    typeof tableSeedRecord === "object" &&
    normalizeEntityId(tableSeedRecord.id) === normalizeEntityId(movementId);

  const detailQuery = useQuery({
    queryKey: [...STOCK_MOVEMENT_DETAIL_QUERY_PREFIX, movementId],
    queryFn: () => fetchStockMovement(/** @type {number | string} */ (movementId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
    placeholderData: seedMatches ? tableSeedRecord : undefined,
  });

  const record = detailQuery.data ?? null;

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly: true,
    modal,
    t,
    onClose,
    shouldConfirmDiscard: () => false,
  });

  const title =
    record?.type === "adjustment" ? t("adjustmentViewDrawerTitle") : t("movementViewDrawerTitle");

  const recordName = useMemo(() => {
    const code = record?.item?.item_code;
    return typeof code === "string" && code.trim() ? code : null;
  }, [record]);

  const quantityLabel = useMemo(() => {
    const value = record?.quantity_delta;
    const n = Number(value);
    const formatted = formatStockQuantity(value);
    if (Number.isFinite(n) && n > 0) return `+${formatted}`;
    return formatted;
  }, [record]);

  const onHandLabel = useMemo(() => {
    const value = record?.quantity_on_hand;
    if (value == null) return "—";
    return formatStockQuantity(value);
  }, [record]);

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={recordName}
      open={open}
      requestClose={requestClose}
      submitting={false}
      footer={
        <div className="flex justify-end">
          <Button onClick={forceClose}>{t("drawerClose")}</Button>
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
          <Descriptions.Item label={t("colMovementDate")}>
            {formatTenantDateTime(record.created_at) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colMovementType")}>
            {getStockMovementTypeLabel(t, /** @type {string} */ (record.type))}
          </Descriptions.Item>
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
          <Descriptions.Item label={t("colWarehouse")}>
            {record?.warehouse?.name ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colLot")}>
            {record?.lot?.lot_number ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colExpiry")}>
            {record?.lot?.expiry_date
              ? record.lot.is_expired
                ? `${formatTenantDate(record.lot.expiry_date) || record.lot.expiry_date} · ${t("lotExpired")}`
                : formatTenantDate(record.lot.expiry_date) || record.lot.expiry_date
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colQuantityDelta")}>{quantityLabel}</Descriptions.Item>
          <Descriptions.Item label={t("colUnitCost")}>
            {formatTenantMoney(record?.unit_cost) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colValueDelta")}>
            {formatTenantMoney(record?.value_delta) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colQuantityOnHand")}>{onHandLabel}</Descriptions.Item>
          <Descriptions.Item label={t("colLineUom")}>
            {formatUomLabel(record?.item_uom?.uom) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("colUser")}>{record?.user?.name ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("colNotes")}>
            {typeof record?.notes === "string" && record.notes.trim() ? record.notes : "—"}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </ResourceCrudDrawer>
  );
}
