"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { formatTenantMoney } from "@/lib/tenant-format";
import { isPersistedEntityId } from "@/lib/entityId";
import { Input, InputNumber, Select } from "antd";
import { useMemo } from "react";
import { PI_BASE_UOM } from "../../utils/purchaseInvoiceDrawerUtils";
import { usePurchaseInvoiceLineUomOptions } from "../../queries/usePurchaseInvoiceDrawerData";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string) => void;
 * }} props
 */
function PiLineUomField({ itemId, value, readOnly, t, onChange }) {
  const { options, pending } = usePurchaseInvoiceLineUomOptions({
    itemId,
    t,
    enabled: !readOnly && isPersistedEntityId(itemId),
  });

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className="w-full"
      placeholder={t("baseUomOption")}
      value={value ?? PI_BASE_UOM}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={onChange}
    />
  );
}

/**
 * @param {{
 *   lines: import("../../utils/purchaseInvoiceDrawerUtils").PiLineFormRow[];
 *   readOnly: boolean;
 *   itemOptions?: { value: string; label: string }[];
 *   itemsPending?: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/purchaseInvoiceDrawerUtils").PiLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine?: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function PurchaseInvoiceLineEditor({
  lines,
  readOnly,
  itemOptions = [],
  itemsPending = false,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  t,
}) {
  const columns = useMemo(
    () => [
      { key: "item", label: t("lineItem"), width: "minmax(220px, 1fr)" },
      { key: "quantity", label: t("lineQuantity"), width: "120px" },
      { key: "uom", label: t("lineUom"), width: "140px" },
      { key: "unit_price", label: t("lineUnitPrice"), width: "130px" },
      ...(readOnly
        ? [
            { key: "tax", label: t("lineTax"), width: "110px" },
            { key: "total", label: t("lineTotal"), width: "120px" },
          ]
        : []),
    ],
    [t, readOnly],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("linesTitle")} description={t("linesDescription")} />

      <div className="min-w-0 overflow-x-auto">
        <div className="w-max min-w-full">
          <LinesGrid
            columns={columns}
            lines={lines}
            canAddLine={!readOnly}
            onAddLine={onAddLine ?? (() => {})}
            addLabel={t("panelAddRow")}
            deleteAriaLabel={t("panelDeleteConfirm")}
            onRemoveLine={onRemoveLine}
            readOnly={readOnly}
            renderField={(line, index, columnKey) => {
              const row =
                /** @type {import("../../utils/purchaseInvoiceDrawerUtils").PiLineFormRow} */ (line);
              if (columnKey === "item") {
                if (readOnly) {
                  return <Input value={row.item_label || row.item_id || ""} disabled />;
                }
                return (
                  <Select
                    showSearch
                    optionFilterProp="label"
                    className="w-full"
                    placeholder={t("lineItemPlaceholder")}
                    value={row.item_id}
                    options={itemOptions}
                    loading={itemsPending}
                    getPopupContainer={drawerSelectGetPopup}
                    onChange={(value) =>
                      onPatchLine(index, {
                        item_id: value,
                        item_uom_id: PI_BASE_UOM,
                      })
                    }
                  />
                );
              }
              if (columnKey === "quantity") {
                return (
                  <InputNumber
                    className="w-full"
                    min={0}
                    value={row.quantity}
                    disabled={readOnly}
                    onChange={(value) => onPatchLine(index, { quantity: value ?? undefined })}
                  />
                );
              }
              if (columnKey === "uom") {
                if (readOnly) {
                  return <Input value={row.item_uom_label || t("baseUomOption")} disabled />;
                }
                return (
                  <PiLineUomField
                    itemId={row.item_id}
                    value={row.item_uom_id ?? PI_BASE_UOM}
                    readOnly={readOnly}
                    t={t}
                    onChange={(value) => onPatchLine(index, { item_uom_id: value })}
                  />
                );
              }
              if (columnKey === "unit_price") {
                return (
                  <InputNumber
                    className="w-full"
                    min={0}
                    value={row.unit_price}
                    disabled={readOnly}
                    onChange={(value) => onPatchLine(index, { unit_price: value ?? undefined })}
                  />
                );
              }
              if (columnKey === "tax") {
                return formatTenantMoney(row.tax_amount) || "—";
              }
              if (columnKey === "total") {
                return formatTenantMoney(row.line_total) || "—";
              }
              return null;
            }}
          />
        </div>
      </div>
    </section>
  );
}
