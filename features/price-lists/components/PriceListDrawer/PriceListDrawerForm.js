"use client";

import { fetchItemInvoiceLineSetup } from "@/features/items/index";
import { ItemUomSelect, SALE_ITEM_OPTIONS_QUERY_KEY, fetchSaleItemOptionsPage } from "@/shared/components/selects/ItemPickers";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Switch, Typography } from "antd";
import { useCallback, useMemo } from "react";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tSelector: (key: string) => string;
 *   currencies: Array<Record<string, unknown>>;
 *   currenciesPending: boolean;
 * }} props
 */
export default function PriceListDrawerForm({ form, readOnly, t, tSelector, currencies, currenciesPending }) {
  const currencyOptions = useMemo(
    () =>
      (currencies ?? []).map((c) => ({
        value: Number(c.id),
        label: [c.code, c.name].filter(Boolean).join(" — "),
      })),
    [currencies],
  );
  const itemsWatch = Form.useWatch("items", form);

  /** Picking an item resets the unit to the item's default sale unit once units load. */
  const onItemChange = useCallback(
    (index, value, option) => {
      const items = [...(form.getFieldValue("items") ?? [])];
      items[index] = { ...items[index], item_id: value ?? null, item_label: option?.label ?? null, item_uom_id: null };
      form.setFieldsValue({ items });
      if (!value) return;
      fetchItemInvoiceLineSetup(String(value))
        .then((setup) => {
          const uoms = Array.isArray(setup?.item_uoms) ? setup.item_uoms : [];
          const pick = uoms.find((u) => u.is_default_sale) ?? uoms.find((u) => u.is_base) ?? uoms[0];
          if (!pick) return;
          const next = [...(form.getFieldValue("items") ?? [])];
          if (String(next[index]?.item_id ?? "") !== String(value)) return;
          next[index] = {
            ...next[index],
            item_uom_id: Number(pick.id),
            price: next[index]?.price ?? (pick.selling_price != null ? Number(pick.selling_price) : null),
          };
          form.setFieldsValue({ items: next });
        })
        .catch(() => {});
    },
    [form],
  );

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item
          name="code"
          label={t("fieldCode")}
          rules={[
            { required: true, message: t("fieldCodeRequired") },
            { max: 50, message: t("fieldCodeMax") },
            { pattern: /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, message: t("fieldCodePattern") },
          ]}
        >
          <Input autoComplete="off" placeholder={t("fieldCodePlaceholder")} />
        </Form.Item>
        <Form.Item
          name="currency_id"
          label={t("fieldCurrency")}
          rules={[{ required: true, message: t("fieldCurrencyRequired") }]}
          extra={t("fieldCurrencyHint")}
        >
          <Select showSearch optionFilterProp="label" loading={currenciesPending} options={currencyOptions} />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("fieldName")}
          rules={[
            { required: true, message: t("fieldNameRequired") },
            { max: 255, message: t("fieldNameMax") },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="name_ar" label={t("fieldNameAr")} rules={[{ max: 255, message: t("fieldNameMax") }]}>
          <Input autoComplete="off" dir="rtl" />
        </Form.Item>
        <Form.Item name="valid_from" label={t("fieldValidFrom")}>
          <DatePicker className="w-full" allowClear />
        </Form.Item>
        <Form.Item
          name="valid_to"
          label={t("fieldValidTo")}
          dependencies={["valid_from"]}
          rules={[
            ({ getFieldValue }) => ({
              validator: async (_, value) => {
                const from = getFieldValue("valid_from");
                if (value && from && value.isBefore(from, "day")) throw new Error(t("fieldValidToBeforeFrom"));
              },
            }),
          ]}
        >
          <DatePicker className="w-full" allowClear />
        </Form.Item>
        <Form.Item name="is_default" label={t("fieldIsDefault")} valuePropName="checked" extra={t("fieldIsDefaultHint")}>
          <Switch />
        </Form.Item>
        <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
          <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
        </Form.Item>
      </div>

      <Divider titlePlacement="start" className="!mt-2">
        {t("sectionPrices")}
      </Divider>
      <Typography.Text type="secondary" className="mb-3 block text-sm">
        {t("sectionPricesHint")}
      </Typography.Text>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-2">
            {fields.length > 0 ? (
              <div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] gap-2 px-1 text-xs font-medium text-neutral-500 md:grid">
                <span>{t("colItem")}</span>
                <span>{t("colUnit")}</span>
                <span>{t("colMinQuantity")}</span>
                <span>{t("colPrice")}</span>
                <span />
              </div>
            ) : null}
            {fields.map(({ key, name, ...rest }) => {
              const row = /** @type {Record<string, unknown>} */ ((itemsWatch ?? [])[name] ?? {});
              const seed = row.item_id ? [{ value: String(row.item_id), label: String(row.item_label ?? row.item_id) }] : [];
              return (
                <div
                  key={key}
                  className="grid grid-cols-1 items-start gap-2 rounded-md border border-neutral-200 p-2 md:grid-cols-[minmax(0,3fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] md:border-0 md:p-0 dark:border-neutral-700"
                >
                  <Form.Item {...rest} name={[name, "item_id"]} className="mb-0" rules={[{ required: true, message: t("fieldItemRequired") }]}>
                    <ServerSearchSelect
                      value={row.item_id ?? undefined}
                      onChange={(value, option) => onItemChange(name, value, option)}
                      fetchPage={fetchSaleItemOptionsPage}
                      queryKey={SALE_ITEM_OPTIONS_QUERY_KEY}
                      recentKind="price-list-item"
                      seedOptions={seed}
                      disabled={readOnly}
                      placeholder={t("fieldItemPlaceholder")}
                      recentLabel={tSelector("selectorRecent")}
                      clearRecentLabel={tSelector("selectorClearRecent")}
                      resultsLabel={tSelector("selectorResults")}
                      loadMoreLabel={tSelector("selectorLoadMore")}
                      emptyLabel={tSelector("selectorEmpty")}
                      typeToSearchLabel={tSelector("selectorTypeToSearch")}
                    />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, "item_uom_id"]} className="mb-0" rules={[{ required: true, message: t("fieldUnitRequired") }]}>
                    <ItemUomSelect itemId={row.item_id} disabled={readOnly} placeholder={t("colUnit")} />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, "min_quantity"]} className="mb-0">
                    <InputNumber min={0} className="w-full" placeholder="0" stringMode={false} />
                  </Form.Item>
                  <Form.Item {...rest} name={[name, "price"]} className="mb-0" rules={[{ required: true, message: t("fieldPriceRequired") }]}>
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                  {!readOnly ? (
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label={t("actionDelete")} onClick={() => remove(name)} />
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
            {!readOnly ? (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ item_id: null, item_uom_id: null, min_quantity: 0, price: null })} block>
                {t("addPriceRow")}
              </Button>
            ) : null}
            {readOnly && fields.length === 0 ? <Typography.Text type="secondary">{t("noPrices")}</Typography.Text> : null}
          </div>
        )}
      </Form.List>
    </Form>
  );
}
