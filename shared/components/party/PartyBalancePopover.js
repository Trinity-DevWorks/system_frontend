"use client";

import { tenantRequest } from "@/lib/axios";
import { formatTenantMoney } from "@/lib/tenant-format";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Form, Popover, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Small info icon next to a customer/supplier field. Clicking it opens a floating card with the
 * party's balance, credit limit and remaining credit per currency. It takes no space in the form.
 *
 * @param {{
 *   party: "customer" | "supplier";
 *   partyId: unknown;
 *   currencyId?: unknown;
 *   getPopupContainer?: (node: HTMLElement) => HTMLElement;
 * }} props
 */
export default function PartyBalancePopover({ party, partyId, currencyId = null, getPopupContainer }) {
  const t = useTranslations("PartyBalance");
  const [open, setOpen] = useState(false);
  const id = partyId == null || partyId === "" || String(partyId).startsWith("__") ? null : String(partyId);

  const query = useQuery({
    queryKey: ["tenant", `${party}-balance`, id],
    queryFn: () => tenantRequest("GET", `${party === "customer" ? "customers" : "suppliers"}/${id}/balance`),
    enabled: open && id != null,
    // Balances move with every posting: always fresh when the card opens.
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (id == null) return null;

  const currencies = Array.isArray(query.data?.currencies) ? query.data.currencies : [];
  // The document's currency first.
  const rows = [...currencies].sort((a, b) => Number(Number(b.currency_id) === Number(currencyId)) - Number(Number(a.currency_id) === Number(currencyId)));

  const content = (
    <div className="min-w-[240px] max-w-[320px]">
      {query.isPending ? (
        <div className="flex justify-center py-3">
          <Spin size="small" />
        </div>
      ) : query.isError ? (
        <Typography.Text type="danger">{t("loadError")}</Typography.Text>
      ) : rows.length === 0 ? (
        <Typography.Text type="secondary">{t("noBalance")}</Typography.Text>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const limit = Number(row.credit_limit ?? 0);
            const remaining = Number(row.remaining_credit ?? 0);
            const balance = Number(row.balance ?? 0);
            const overLimit = limit > 0 && balance > limit;
            return (
              <div key={String(row.currency_id)} className="text-sm">
                <div className="mb-1 font-semibold">{row.currency_code}</div>
                <InfoRow label={t(party === "customer" ? "balanceCustomer" : "balanceSupplier")} value={formatTenantMoney(balance)} strong />
                <InfoRow label={t("creditLimit")} value={limit > 0 ? formatTenantMoney(limit) : t("noLimit")} />
                {limit > 0 ? (
                  <InfoRow
                    label={t("remaining")}
                    value={formatTenantMoney(remaining)}
                    danger={overLimit || remaining <= 0}
                  />
                ) : null}
                {Number(row.opening_balance ?? 0) !== 0 ? (
                  <InfoRow label={t("openingBalance")} value={formatTenantMoney(row.opening_balance)} muted />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      title={t(party === "customer" ? "titleCustomer" : "titleSupplier")}
      content={content}
      getPopupContainer={getPopupContainer}
    >
      <button
        type="button"
        className="inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-neutral-400 hover:text-blue-500"
        aria-label={t("open")}
        title={t("open")}
        onClick={(e) => e.stopPropagation()}
      >
        <InfoCircleOutlined />
      </button>
    </Popover>
  );
}

/**
 * @param {{ label: string; value: string; strong?: boolean; danger?: boolean; muted?: boolean }} props
 */
function InfoRow({ label, value, strong = false, danger = false, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted ? "text-neutral-400" : "text-neutral-500"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""} ${danger ? "text-red-500" : ""}`}>{value}</span>
    </div>
  );
}

/**
 * Field label with the balance icon next to it. Reads the party and currency from the surrounding form.
 *
 * @param {{
 *   label: import("react").ReactNode;
 *   party: "customer" | "supplier";
 *   partyField: string;
 *   currencyField?: string;
 *   getPopupContainer?: (node: HTMLElement) => HTMLElement;
 * }} props
 */
export function PartyBalanceLabel({ label, party, partyField, currencyField = "currency_id", getPopupContainer }) {
  const form = Form.useFormInstance();
  const partyId = Form.useWatch(partyField, form);
  const currencyId = Form.useWatch(currencyField, form);

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <PartyBalancePopover party={party} partyId={partyId} currencyId={currencyId} getPopupContainer={getPopupContainer} />
    </span>
  );
}
