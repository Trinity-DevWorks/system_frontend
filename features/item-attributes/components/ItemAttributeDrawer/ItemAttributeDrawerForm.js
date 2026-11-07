"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import { Form, Input, InputNumber, Typography } from "antd";
import { ATTRIBUTE_CODE_PATTERN } from "../../utils/itemAttributeDrawerUtils";

const toUpper = (v) => String(v ?? "").toUpperCase();

/**
 * Attribute header fields + its value rows.
 *
 * @param {{ form: import("antd").FormInstance; readOnly: boolean; t: (key: string) => string }} props
 */
export default function ItemAttributeDrawerForm({ form, readOnly, t }) {
  const codeRules = [
    { required: true, message: t("fieldCodeRequired") },
    { max: 32, pattern: ATTRIBUTE_CODE_PATTERN, message: t("fieldCodePattern") },
  ];
  const nameRules = [{ required: true, message: t("fieldNameRequired") }, { max: 120 }];
  const columns = [
    { key: "code", label: t("colCode"), width: "minmax(0, 1fr)" },
    { key: "name", label: t("colName"), width: "minmax(0, 2fr)" },
  ];

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Form.Item name="code" label={t("colCode")} rules={codeRules} normalize={toUpper}>
          <Input autoComplete="off" placeholder={t("fieldCodePlaceholder")} />
        </Form.Item>
        <Form.Item name="name" label={t("colName")} rules={nameRules}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="sort_order" label={t("colSort")}>
          <InputNumber min={0} max={9999} className="!w-full" />
        </Form.Item>
      </div>

      <div className="mb-2 flex flex-col">
        <Typography.Text strong>{t("sectionValues")}</Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          {t("valuesHint")}
        </Typography.Text>
      </div>
      <Form.List name="values">
        {(fields, { add, remove }) => (
          <section className="item-lines-panel">
            <LinesGrid
              columns={columns}
              lines={fields}
              canAddLine={!readOnly}
              onAddLine={() => add({ code: "", name: "" })}
              addLabel={t("addValue")}
              deleteAriaLabel={t("removeValue")}
              onRemoveLine={(index) => remove(index)}
              canRemoveLine={fields.length > 1}
              showDeleteColumn={!readOnly}
              readOnly={readOnly}
              renderField={(field, _index, key) =>
                key === "code" ? (
                  <>
                    {/* Keeps the saved value id so a save updates it instead of re-creating it. */}
                    <Form.Item name={[field.name, "id"]} hidden noStyle>
                      <Input />
                    </Form.Item>
                    <Form.Item name={[field.name, "code"]} className="!mb-0" rules={codeRules} normalize={toUpper}>
                      <Input autoComplete="off" />
                    </Form.Item>
                  </>
                ) : (
                  <Form.Item name={[field.name, "name"]} className="!mb-0" rules={nameRules}>
                    <Input autoComplete="off" />
                  </Form.Item>
                )
              }
            />
          </section>
        )}
      </Form.List>
    </Form>
  );
}
