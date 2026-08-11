"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { BRANCH_CONTEXT_QUERY_KEY, setActiveBranchId } from "@/lib/active-branch";
import {
  normalizePermissionMatrix,
  PERMISSIONS_QUERY_KEY,
} from "@/lib/permissions";
import { fetchBranchContext, switchBranch } from "@/services/branchContextApi";
import {
  PURCHASE_ORDERS_QUERY_KEY,
  PURCHASING_ALERTS_QUERY_KEY,
  PURCHASING_ALERTS_SUMMARY_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  STOCK_TRANSFERS_QUERY_KEY,
} from "@/components/stock/stockQueryCache";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Select } from "antd";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Active branch switcher for the shell header.
 */
export default function BranchSwitcher() {
  const t = useTranslations("Shell");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const contextQuery = useQuery({
    queryKey: BRANCH_CONTEXT_QUERY_KEY,
    queryFn: fetchBranchContext,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Keep cookie in sync with server preference / resolved active branch (cross-device).
  useEffect(() => {
    const id = contextQuery.data?.active_branch_id;
    if (id != null) {
      setActiveBranchId(id);
    }
  }, [contextQuery.data?.active_branch_id]);

  // Keep client RBAC matrix aligned when branch context is loaded/refetched.
  useEffect(() => {
    const permissions = contextQuery.data?.permissions;
    if (permissions != null) {
      queryClient.setQueryData(
        PERMISSIONS_QUERY_KEY,
        normalizePermissionMatrix(permissions),
      );
    }
  }, [contextQuery.data?.permissions, queryClient]);

  const list = Array.isArray(contextQuery.data?.accessible_branches)
    ? contextQuery.data.accessible_branches
    : [];
  const options = list.map((b) => {
    const base =
      typeof b.shortcut_name === "string" && b.shortcut_name.trim()
        ? `${b.name} (${b.shortcut_name})`
        : String(b.name ?? b.id);
    const inactive = b.is_active === false;
    return {
      value: Number(b.id),
      label: inactive ? `${base} — ${t("branchInactive")}` : base,
      disabled: inactive,
    };
  });

  const activeId =
    contextQuery.data?.active_branch_id != null
      ? Number(contextQuery.data.active_branch_id)
      : undefined;

  const switchMutation = useMutation({
    mutationFn: (branchId) => switchBranch(branchId),
    onSuccess: (data, branchId) => {
      setActiveBranchId(branchId);
      const permissions = data?.permissions;
      queryClient.setQueryData(BRANCH_CONTEXT_QUERY_KEY, data);
      if (permissions != null) {
        queryClient.setQueryData(
          PERMISSIONS_QUERY_KEY,
          normalizePermissionMatrix(permissions),
        );
      } else {
        queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
      }
      queryClient.invalidateQueries({ queryKey: ["tenant", "warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", "salesmen"] });
      queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tenant", "stock", "transfer"] });
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tenant", "stock", "purchase-order"] });
      queryClient.invalidateQueries({ queryKey: PURCHASING_ALERTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PURCHASING_ALERTS_SUMMARY_QUERY_KEY });
      message.success(t("branchSwitchSuccess"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("branchSwitchError"));
    },
  });

  if (options.length === 0 && !contextQuery.isPending) {
    return null;
  }

  return (
    <Select
      className="min-w-[9.5rem] max-w-[14rem]"
      size="middle"
      loading={contextQuery.isPending || switchMutation.isPending}
      options={options}
      value={Number.isFinite(activeId) ? activeId : undefined}
      placeholder={t("branchSwitcherPlaceholder")}
      aria-label={t("branchSwitcherAria")}
      onChange={(value) => {
        const id = Number(value);
        if (!Number.isFinite(id) || id === activeId) return;
        const opt = options.find((o) => o.value === id);
        if (opt?.disabled) return;
        switchMutation.mutate(id);
      }}
      optionFilterProp="label"
      showSearch={options.length > 5}
    />
  );
}
