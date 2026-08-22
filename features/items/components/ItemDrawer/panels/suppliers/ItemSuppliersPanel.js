"use client";

/**
 * Suppliers tab — list and inline create/edit/delete for item suppliers.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Table, Tooltip } from "antd";
import { useItemSuppliersPanel } from "./useItemSuppliersPanel";

/**
 * @param {{
 *   itemId: number;
 *   readOnly: boolean;
 *   allowPurchase?: boolean;
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 * }} props
 */
export function ItemSuppliersPanel({ itemId, readOnly, allowPurchase = true, t, tApiErrors, active }) {
  const {
    isPending,
    tableData,
    columns,
    getInlineValues,
    allowPurchase: purchaseAllowed,
    addSupplierDisabled,
    addSupplierDisabledReason,
    suppliersQueryPending,
    suppliersQueryFetched,
    startCreateRow,
  } = useItemSuppliersPanel({ itemId, readOnly, allowPurchase, t, tApiErrors, active });

  return (
    <section>
      <ResourceDrawerPanelHeader
        title={t("tabSuppliers")}
        description={t("tabSuppliersDescription")}
        actions={
          !readOnly ? (
            <Tooltip title={addSupplierDisabledReason ?? undefined}>
              <span className="inline-block">
                <Button
                  type="primary"
                  ghost
                  icon={<PlusOutlined />}
                  disabled={addSupplierDisabled}
                  loading={suppliersQueryPending && !suppliersQueryFetched}
                  onClick={startCreateRow}
                >
                  {t("panelAddSupplier")}
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />
      {!purchaseAllowed ? (
        <Alert type="info" showIcon className="!mb-3" title={t("supplierPurchaseNotAllowedHint")} />
      ) : null}
      <Table
        className="resource-drawer-data-table"
        rowKey="id"
        size="small"
        loading={isPending}
        pagination={false}
        dataSource={tableData}
        columns={columns}
        rowClassName={(r) => (getInlineValues(r) ? "resource-drawer-supplier-row-editing" : "")}
      />
    </section>
  );
}
