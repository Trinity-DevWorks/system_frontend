"use client";

import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { dayjsDatePattern, formatTenantMoney } from "@/lib/tenant-format";
import { LockOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Select, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { openingTotalsByCurrency } from "../openingDocumentsUtils";

/**
 * Old open balances of a customer or supplier, one row per old invoice / credit.
 * Positive amount = opening invoice, negative amount = opening credit.
 * A row a payment, credit or refund already uses keeps only its old number and due date editable.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   party: "customer" | "supplier";
 *   readOnly: boolean;
 *   currencies: unknown[];
 *   currenciesPending: boolean;
 * }} props
 */
export default function OpeningDocumentsSection({ form, party, readOnly, currencies, currenciesPending }) {
  const t = useTranslations("OpeningDocuments");
  const rows = Form.useWatch("opening_documents", form);
  const list = Array.isArray(currencies) ? currencies : [];
  const currencyOptions = list
    .filter((c) => c && c.is_active !== false)
    .map((c) => ({ value: c.id, label: `${c.code ?? c.id} — ${c.name ?? ""}` }));
  const currencyCode = (id) => list.find((c) => Number(c?.id) === Number(id))?.code ?? "";
  const primaryId = list.find((c) => c?.is_primary)?.id;
  const totals = [...openingTotalsByCurrency(rows).entries()];

  return (
    <div>
      <Typography.Text className="mb-1 mt-8 block font-medium">{t("title")}</Typography.Text>
      <Typography.Text type="secondary" className="mb-3 block text-sm">
        {t(party === "customer" ? "hintCustomer" : "hintSupplier")}
      </Typography.Text>

      <Form.List name="opening_documents">
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-3">
            {fields.map((field) => {
              const { key, name, ...restField } = field;
              const row = Array.isArray(rows) ? rows[name] ?? {} : {};
              const locked = row.locked === true;
              const isCredit = Number(row.amount ?? 0) < 0;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40"
                >
                  <Form.Item {...restField} name={[name, "id"]} hidden>
                    <Input />
                  </Form.Item>
                  {row.number || locked ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      {row.number ? <span className="font-mono">{row.number}</span> : null}
                      <Tag color={isCredit ? "purple" : "blue"} className="m-0">
                        {t(isCredit ? "kindCredit" : "kindInvoice")}
                      </Tag>
                      {locked ? (
                        <Tooltip title={t("lockedHint")}>
                          <Tag icon={<LockOutlined />} color="gold" className="m-0">
                            {t("used", { amount: formatTenantMoney(row.used_amount ?? 0) })}
                          </Tag>
                        </Tooltip>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1.2fr_1.2fr_auto]">
                    <Form.Item
                      {...restField}
                      name={[name, "original_number"]}
                      label={t("originalNumber")}
                      rules={[{ max: 64, message: t("originalNumberMax") }]}
                      className="mb-2"
                    >
                      <Input placeholder={t("originalNumberPlaceholder")} allowClear />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "document_date"]}
                      label={t("documentDate")}
                      rules={[{ required: true, message: t("documentDateRequired") }]}
                      className="mb-2"
                    >
                      <DatePicker className="w-full" format={dayjsDatePattern()} disabled={readOnly || locked} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "due_on"]}
                      label={t("dueOn")}
                      dependencies={[["opening_documents", name, "document_date"]]}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            const date = getFieldValue(["opening_documents", name, "document_date"]);
                            if (!value || !date || !dayjs(value).isBefore(dayjs(date), "day")) return Promise.resolve();
                            return Promise.reject(new Error(t("dueOnBeforeDate")));
                          },
                        }),
                      ]}
                      className="mb-2"
                    >
                      <DatePicker className="w-full" format={dayjsDatePattern()} disabled={readOnly || isCredit} placeholder={t("dueOnPlaceholder")} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "currency_id"]}
                      label={t("currency")}
                      rules={[{ required: true, message: t("currencyRequired") }]}
                      className="mb-2"
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        loading={currenciesPending}
                        options={currencyOptions}
                        disabled={readOnly || locked}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "amount"]}
                      label={t("amount")}
                      rules={[
                        {
                          validator: (_, value) =>
                            Number.isFinite(Number(value)) && Number(value) !== 0
                              ? Promise.resolve()
                              : Promise.reject(new Error(t("amountRequired"))),
                        },
                      ]}
                      className="mb-2"
                    >
                      <TenantNumberInput kind="money" style={{ width: "100%" }} disabled={readOnly || locked} />
                    </Form.Item>
                    <div className="flex items-start pt-[30px]">
                      {!readOnly && !locked ? (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          aria-label={t("remove")}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {!readOnly ? (
              <Button
                type="dashed"
                onClick={() => add({ currency_id: primaryId, document_date: dayjs(), due_on: null, amount: undefined, original_number: "" })}
                block
                icon={<PlusOutlined />}
              >
                {t("add")}
              </Button>
            ) : null}
            {totals.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-4 text-sm">
                {totals.map(([currencyId, total]) => (
                  <span key={currencyId}>
                    {t("total", { currency: currencyCode(currencyId) })}{" "}
                    <span className="font-semibold tabular-nums">{formatTenantMoney(total)}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </Form.List>
    </div>
  );
}
