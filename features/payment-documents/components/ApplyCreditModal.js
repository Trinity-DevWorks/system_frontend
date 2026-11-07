"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { formatTenantMoney } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useMutation } from "@tanstack/react-query";
import { App, Modal, Select, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

/**
 * Applies credit left on a posted customer receipt to one of the customer's open invoices.
 * The amount is in the receipt currency and cannot be more than the credit left.
 *
 * @param {{
 *   open: boolean;
 *   i18n: string;
 *   creditLeft: number;
 *   currencyCode?: string;
 *   invoices: Array<Record<string, any>>;
 *   invoicesLoading?: boolean;
 *   onApply: (body: { allocations: { sales_invoice_id: string; amount: number }[] }) => Promise<unknown>;
 *   onClose: () => void;
 *   onApplied: () => void;
 * }} props
 */
export default function ApplyCreditModal({ open, i18n, creditLeft, currencyCode = "", invoices, invoicesLoading = false, onApply, onClose, onApplied }) {
  const t = useTranslations(i18n);
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message } = App.useApp();
  const [invoiceId, setInvoiceId] = useState(/** @type {string | null} */ (null));
  const [amount, setAmount] = useState(/** @type {number | null} */ (creditLeft));

  const options = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: `${inv.invoice_number ?? inv.id} · ${formatTenantMoney(inv.net_to_pay)} ${inv.currency?.code ?? ""}`.trim(),
      })),
    [invoices],
  );

  const apply = useMutation({
    mutationFn: () => onApply({ allocations: [{ sales_invoice_id: String(invoiceId), amount: Number(amount) }] }),
    onSuccess: () => {
      message.success(t("applyCreditSuccess"));
      onApplied();
    },
    onError: (error) => {
      notification.error({ title: t("applyCreditError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    },
  });

  const valid = invoiceId != null && Number(amount) > 0 && Number(amount) <= creditLeft + 0.00001;

  return (
    <Modal
      open={open}
      title={t("applyCredit")}
      okText={t("applyCredit")}
      onOk={() => apply.mutate()}
      okButtonProps={{ disabled: !valid }}
      confirmLoading={apply.isPending}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        <Typography.Text type="secondary">
          {t("creditLeft", { amount: `${formatTenantMoney(creditLeft)} ${currencyCode}`.trim() })}
        </Typography.Text>
        <Select
          className="w-full"
          showSearch
          optionFilterProp="label"
          placeholder={t("addInvoice")}
          loading={invoicesLoading}
          options={options}
          value={invoiceId}
          onChange={setInvoiceId}
        />
        <TenantNumberInput
          kind="money"
          min={0}
          className="w-full"
          value={amount}
          onChange={(value) => setAmount(value == null ? null : Number(value))}
          addonAfter={currencyCode || undefined}
        />
      </div>
    </Modal>
  );
}
