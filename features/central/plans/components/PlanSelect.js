"use client";

import { formatTenantMoney } from "@/lib/tenant-format";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { fetchCentralPlanNames } from "../api/plans.api";
import { CENTRAL_PLAN_NAMES_QUERY_KEY } from "../queries/plansQueryKeys";

/** @returns {Record<string, unknown>[]} every plan (for labels and billing cycles) */
export function useCentralPlanOptions() {
  const query = useQuery({
    queryKey: CENTRAL_PLAN_NAMES_QUERY_KEY,
    queryFn: fetchCentralPlanNames,
    staleTime: QUERY_STALE_TIME.default,
  });
  return { plans: Array.isArray(query.data) ? query.data : [], isPending: query.isPending };
}

/**
 * Plan picker: active plans only, labelled "Name — 29.90 USD / month".
 * An inactive plan already assigned (`value`) stays visible so the field is not blank.
 *
 * @param {{
 *   value?: number | null;
 *   onChange?: (value: number | null, plan: Record<string, unknown> | null) => void;
 *   disabled?: boolean;
 *   id?: string;
 * }} props
 */
export default function PlanSelect({ value, onChange, disabled = false, id }) {
  const t = useTranslations("CentralPlans");
  const { plans, isPending } = useCentralPlanOptions();

  const options = useMemo(
    () =>
      plans
        .filter((p) => p.is_active !== false || Number(p.id) === Number(value))
        .map((p) => ({
          value: Number(p.id),
          label: `${p.name} — ${formatTenantMoney(p.price)} ${p.currency} / ${t(`cycleShort_${p.billing_cycle}`)}`,
          plan: p,
        })),
    [plans, value, t],
  );

  return (
    <Select
      id={id}
      value={value ?? undefined}
      onChange={(next, option) =>
        onChange?.(next ?? null, /** @type {{ plan?: Record<string, unknown> }} */ (option)?.plan ?? null)
      }
      options={options}
      loading={isPending}
      disabled={disabled}
      showSearch={{ optionFilterProp: "label" }}
      placeholder={t("selectPlaceholder")}
      notFoundContent={t("selectEmpty")}
    />
  );
}
