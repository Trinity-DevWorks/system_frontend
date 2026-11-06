"use client";

import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Form, Input, Select } from "antd";
import { useMemo } from "react";
import { getEmptyExpenseLine } from "../../utils/expenseVoucherDrawerUtils";

/**
 * Expense lines on the shared lines grid (same look as the other document drawers).
 * The lines stay in the form under `lines`, so validation and the save payload are unchanged.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   expenseOptions: { value: number; label: string }[];
 *   expenseAccountsPending: boolean;
 *   vatOptions: { value: number; label: string }[];
 *   currencyMark?: string;
 * }} props
 */
export default function ExpenseVoucherLineEditor({ form, readOnly, t, expenseOptions, expenseAccountsPending, vatOptions, currencyMark = "" }) {
  // `preserve` reads the stored lines even though `lines` itself has no input of its own.
  const watched = Form.useWatch("lines", { form, preserve: true });
  const lines = useMemo(() => (Array.isArray(watched) && watched.length > 0 ? watched : [getEmptyExpenseLine()]), [watched]);

  const columns = useMemo(
    () => [
      { key: "account_id", label: t("colExpenseAccount"), width: "minmax(220px, 2.2fr)" },
      { key: "description", label: t("colDescription"), width: "minmax(160px, 2fr)" },
      { key: "amount", label: t("colAmount"), width: "170px" },
      { key: "vat_group_id", label: t("colVat"), width: "160px" },
    ],
    [t],
  );

  const setLines = (next) => form.setFieldValue("lines", next.length > 0 ? next : [getEmptyExpenseLine()]);

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("sectionLines")} />
      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly}
        onAddLine={() => setLines([...lines, getEmptyExpenseLine()])}
        addLabel={t("addLine")}
        deleteAriaLabel={t("actionDelete")}
        onRemoveLine={(index) => setLines(lines.filter((_, i) => i !== index))}
        canRemoveLine={lines.length > 1}
        readOnly={readOnly}
        renderField={(_line, index, columnKey) => {
          if (columnKey === "account_id") {
            return (
              <Form.Item name={["lines", index, "account_id"]} noStyle rules={[{ required: true, message: t("fieldExpenseAccountRequired") }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  loading={expenseAccountsPending}
                  options={expenseOptions}
                  placeholder={t("colExpenseAccount")}
                  disabled={readOnly}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            );
          }
          if (columnKey === "description") {
            return (
              <Form.Item name={["lines", index, "description"]} noStyle>
                <Input disabled={readOnly} maxLength={255} />
              </Form.Item>
            );
          }
          if (columnKey === "amount") {
            return (
              <Form.Item name={["lines", index, "amount"]} noStyle rules={[{ required: true, message: t("fieldAmountRequired") }]}>
                <TenantNumberInput kind="money" min={0} className="w-full" disabled={readOnly} addonAfter={currencyMark || undefined} />
              </Form.Item>
            );
          }
          return (
            <Form.Item name={["lines", index, "vat_group_id"]} noStyle>
              <Select allowClear className="w-full" options={vatOptions} disabled={readOnly} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
          );
        }}
      />
    </section>
  );
}
