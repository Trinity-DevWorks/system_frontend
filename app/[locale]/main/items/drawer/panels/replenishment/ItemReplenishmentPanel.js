"use client";

/**
 * Replenishment tab — per-warehouse safety stock, reorder point, and max qty rules.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/components/resource-drawer/ResourceDrawerPanelHeader";
import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Table, Tooltip } from "antd";
import { useItemReplenishmentPanel } from "./useItemReplenishmentPanel";

/**
 * @param {{
 *   itemId: number;
 *   readOnly: boolean;
 *   trackInventory?: boolean;
 *   allowPurchase?: boolean;
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 * }} props
 */
export function ItemReplenishmentPanel({
  itemId,
  readOnly,
  trackInventory = true,
  allowPurchase = true,
  t,
  tApiErrors,
  active,
}) {
  const panel = useItemReplenishmentPanel({
    itemId,
    readOnly,
    trackInventory,
    allowPurchase,
    t,
    tApiErrors,
    active,
  });

  const {
    isPending,
    tableData,
    columns,
    getInlineValues,
    replenishmentAllowed,
    addDisabled,
    addDisabledReason,
    warehousesQueryPending,
    warehousesQueryFetched,
    startCreateRow,
  } = panel;

  return (
    <section>
      <ResourceDrawerPanelHeader
        title={t("tabReplenishment")}
        description={t("tabReplenishmentDescription")}
        actions={
          !readOnly && replenishmentAllowed ? (
            <Tooltip title={addDisabledReason ?? undefined}>
              <span className="inline-block">
                <Button
                  type="primary"
                  ghost
                  icon={<PlusOutlined />}
                  disabled={addDisabled}
                  loading={warehousesQueryPending && !warehousesQueryFetched}
                  onClick={startCreateRow}
                >
                  {t("replenishmentAddRule")}
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />

      {!trackInventory ? (
        <Alert type="info" showIcon className="!mb-3" title={t("replenishmentTrackInventoryHint")} />
      ) : !allowPurchase ? (
        <Alert type="info" showIcon className="!mb-3" title={t("replenishmentPurchaseNotAllowedHint")} />
      ) : (
        <Alert type="info" showIcon className="!mb-3" title={t("replenishmentMethodHint")} />
      )}

      {replenishmentAllowed ? (
        <Table
          className="resource-drawer-data-table"
          rowKey="id"
          size="small"
          loading={isPending}
          pagination={false}
          dataSource={tableData}
          columns={columns}
          rowClassName={(r) => (getInlineValues(r) ? "resource-drawer-replenishment-row-editing" : "")}
        />
      ) : null}
    </section>
  );
}
