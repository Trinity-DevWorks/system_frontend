"use client";

/**
 * Bundle line editor UI — header, save action, and lines grid.
 *
 * Used by:
 * - drawer/panels/bundle/ItemBundlePanel.js
 */

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Button, InputNumber, Select } from "antd";
import { useBundleLineEditor } from "./useBundleLineEditor";

/**
 * @param {{
 *   itemId: number;
 *   initialLines: { child_item_id?: string; quantity?: number }[];
 *   itemOptions: { value: number; label: string }[];
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 * }} props
 */
export function BundleLineEditor({ itemId, initialLines, itemOptions, t, tApiErrors }) {
  const {
    lines,
    canSave,
    canAddLine,
    syncMutation,
    patchLine,
    removeLine,
    addLine,
    bundleColumns,
  } = useBundleLineEditor({ itemId, initialLines, t, tApiErrors });

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader
        title={t("tabBundle")}
        description={t("tabBundleDescription")}
        actions={
          <Button
            type="primary"
            loading={syncMutation.isPending}
            disabled={!canSave || syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {t("panelSaveBundle")}
          </Button>
        }
      />

      <LinesGrid
        columns={bundleColumns}
        lines={lines}
        canAddLine={canAddLine}
        onAddLine={addLine}
        addLabel={t("panelAddRow")}
        deleteAriaLabel={t("panelDeleteConfirm")}
        onRemoveLine={removeLine}
        renderField={(line, index, columnKey) => {
          const row = /** @type {{ child_item_id?: string; quantity?: number }} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("bundleFieldItem")}
                value={row.child_item_id}
                options={itemOptions}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(v) => patchLine(index, { child_item_id: v })}
              />
            );
          }
          return (
            <InputNumber
              className="w-full"
              min={0.000001}
              placeholder={t("bundleFieldQty")}
              value={row.quantity}
              onChange={(v) => patchLine(index, { quantity: v ?? undefined })}
            />
          );
        }}
      />
    </section>
  );
}
