"use client";

import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   supplierOptions: { value: string; label: string }[];
 *   currencyOptions: { value: number; label: string }[];
 *   paymentTermOptions: { value: number; label: string }[];
 *   catalogsPending?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function PurchaseInvoiceDrawerForm({
  form,
  readOnly,
  supplierOptions,
  currencyOptions,
  paymentTermOptions,
  catalogsPending = false,
  t,
}) {
  return (
    <Form form={form} layout="vertical" disabled={readOnly} className="space-y-1">
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item
          name="supplier_id"
          label={t("fieldSupplier")}
          rules={[{ required: true, message: t("fieldSupplierRequired") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("fieldSupplierPlaceholder")}
            options={supplierOptions}
            loading={catalogsPending}
            getPopupContainer={drawerSelectGetPopup}
          />
        </Form.Item>

        <Form.Item
          name="currency_id"
          label={t("fieldCurrency")}
          rules={[{ required: true, message: t("fieldCurrencyRequired") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("fieldCurrencyPlaceholder")}
            options={currencyOptions}
            loading={catalogsPending}
            getPopupContainer={drawerSelectGetPopup}
          />
        </Form.Item>

        <Form.Item name="payment_terms_id" label={t("fieldPaymentTerms")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("fieldPaymentTermsPlaceholder")}
            options={paymentTermOptions}
            loading={catalogsPending}
            getPopupContainer={drawerSelectGetPopup}
          />
        </Form.Item>

        <Form.Item
          name="invoice_date"
          label={t("fieldInvoiceDate")}
          rules={[{ required: true, message: t("fieldInvoiceDateRequired") }]}
          getValueProps={(value) => ({
            value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
          })}
        >
          <DatePicker className="w-full" format={dayjsDatePattern()} />
        </Form.Item>

        <Form.Item
          name="due_date"
          label={t("fieldDueDate")}
          getValueProps={(value) => ({
            value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
          })}
        >
          <DatePicker className="w-full" format={dayjsDatePattern()} />
        </Form.Item>

        <Form.Item name="supplier_reference" label={t("fieldSupplierReference")}>
          <Input maxLength={128} placeholder={t("fieldSupplierReferencePlaceholder")} />
        </Form.Item>
      </div>

      <Form.Item name="notes" label={t("fieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} />
      </Form.Item>
    </Form>
  );
}
