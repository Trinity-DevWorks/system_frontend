"use client";

/**
 * Recipe line editor UI — yield header form, save action, and ingredient lines grid.
 *
 * Used by:
 * - drawer/panels/recipe/ItemRecipePanel.js
 */

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Button, Col, Form, InputNumber, Row, Select } from "antd";
import { useRecipeLineEditor } from "./useRecipeLineEditor";

/**
 * @param {{
 *   itemId: number;
 *   initialHeader: { yield_quantity: number; uom_id?: number };
 *   initialLines: { item_id?: string; quantity?: number; uom_id?: number }[];
 *   itemOptions: { value: number; label: string }[];
 *   uomOptions: { value: number; label: string }[];
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 * }} props
 */
export function RecipeLineEditor({
  itemId,
  initialHeader,
  initialLines,
  itemOptions,
  uomOptions,
  t,
  tApiErrors,
}) {
  const {
    headerForm,
    lines,
    canSave,
    canAddLine,
    saveMutation,
    patchLine,
    removeLine,
    addLine,
    recipeColumns,
  } = useRecipeLineEditor({ itemId, initialHeader, initialLines, t, tApiErrors });

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader
        title={t("tabRecipe")}
        description={t("tabRecipeDescription")}
        actions={
          <Button
            type="primary"
            loading={saveMutation.isPending}
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t("panelSaveRecipe")}
          </Button>
        }
      />

      <div className="item-lines-section-card item-lines-yield-card">
        <Form
          form={headerForm}
          layout="vertical"
          requiredMark={false}
          className="item-general-form"
          initialValues={initialHeader}
        >
          <Row className="item-lines-yield-row" gutter={[24, 0]} wrap={false}>
            <Col flex="120px" className="item-lines-yield-col item-lines-yield-col-qty">
              <Form.Item
                name="yield_quantity"
                label={<ResourceDrawerFieldLabel text={t("recipeYield")} required />}
                rules={[{ required: true, message: t("recipeYield") }]}
              >
                <InputNumber className="w-full" min={0.000001} />
              </Form.Item>
            </Col>
            <Col flex="200px" className="item-lines-yield-col item-lines-yield-col-uom">
              <Form.Item
                name="uom_id"
                label={<ResourceDrawerFieldLabel text={t("recipeYieldUom")} required />}
                rules={[{ required: true, message: t("recipeYieldUom") }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  options={uomOptions}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <LinesGrid
        columns={recipeColumns}
        lines={lines}
        canAddLine={canAddLine}
        onAddLine={addLine}
        addLabel={t("panelAddRow")}
        deleteAriaLabel={t("panelDeleteConfirm")}
        onRemoveLine={removeLine}
        renderField={(line, index, columnKey) => {
          const row = /** @type {{ item_id?: string; quantity?: number; uom_id?: number }} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("recipeFieldItem")}
                value={row.item_id}
                options={itemOptions}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(v) => patchLine(index, { item_id: v })}
              />
            );
          }
          if (columnKey === "qty") {
            return (
              <InputNumber
                className="w-full"
                min={0.000001}
                placeholder={t("recipeFieldQty")}
                value={row.quantity}
                onChange={(v) => patchLine(index, { quantity: v ?? undefined })}
              />
            );
          }
          return (
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("recipeFieldUom")}
              value={row.uom_id}
              options={uomOptions}
              getPopupContainer={drawerSelectGetPopup}
              onChange={(v) => patchLine(index, { uom_id: v })}
            />
          );
        }}
      />
    </section>
  );
}
