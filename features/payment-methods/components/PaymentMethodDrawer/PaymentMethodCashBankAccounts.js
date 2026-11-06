"use client";

import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { useQuery } from "@tanstack/react-query";
import { Form, Select } from "antd";
import { useMemo } from "react";

/**
 * Cash boxes / bank accounts this method uses (Cash -> Cash USD, Cash LBP, ...). On a sale the invoice
 * currency and branch pick one of them. Form field: `cash_bank_account_ids`.
 *
 * @param {{ readOnly: boolean; t: (key: string) => string }} props
 */
export default function PaymentMethodCashBankAccounts({ readOnly, t }) {
  const accountsQuery = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: () => fetchCashBankAccountNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const accountOptions = useMemo(
    () =>
      (Array.isArray(accountsQuery.data) ? accountsQuery.data : [])
        .filter((a) => a && a.is_active !== false)
        .map((a) => ({
          value: Number(a.id),
          label: `${a.code} — ${a.name} · ${a.currency_code ?? ""} · ${a.branch_name ?? t("fieldSharedAccount")}`,
        })),
    [accountsQuery.data, t],
  );

  return (
    <Form.Item
      name="cash_bank_account_ids"
      label={<ResourceDrawerFieldLabel text={t("fieldCashBankAccounts")} />}
    >
      <Select
        mode="multiple"
        allowClear
        showSearch
        optionFilterProp="label"
        options={accountOptions}
        loading={accountsQuery.isPending}
        disabled={readOnly}
        getPopupContainer={drawerSelectGetPopup}
      />
    </Form.Item>
  );
}
