"use client";

/**
 * Barcodes tab — list and inline create/edit/delete for item barcodes.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Table } from "antd";
import { useItemBarcodesPanel } from "./useItemBarcodesPanel";

/**
 * @param {{ itemId: number; readOnly: boolean; t: (k: string) => string; tApiErrors: (k: string) => string; active: boolean; itemUoms: unknown[] }} props
 */
export function ItemBarcodesPanel({ itemId, readOnly, t, tApiErrors, active, itemUoms }) {
  const { isPending, tableData, columns, inlineEdit, itemUomOptions, getInlineValues, startCreateRow } =
    useItemBarcodesPanel({ itemId, readOnly, t, tApiErrors, active, itemUoms });

  return (
    <section>
      <ResourceDrawerPanelHeader
        title={t("tabBarcodes")}
        description={t("tabBarcodesDescription")}
        actions={
          !readOnly ? (
            <Button
              type="primary"
              ghost
              icon={<PlusOutlined />}
              disabled={Boolean(inlineEdit) || itemUomOptions.length === 0}
              onClick={startCreateRow}
            >
              {t("panelAddBarcode")}
            </Button>
          ) : null
        }
      />
      <Table
        className="resource-drawer-data-table"
        rowKey="id"
        size="small"
        loading={isPending}
        pagination={false}
        dataSource={tableData}
        columns={columns}
        rowClassName={(r) => (getInlineValues(r) ? "resource-drawer-barcode-row-editing" : "")}
      />
    </section>
  );
}
