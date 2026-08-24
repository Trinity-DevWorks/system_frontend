"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { BRANCH_CONTEXT_QUERY_KEY, setActiveBranchId } from "@/lib/active-branch";
import { applyAuthMePermissions } from "@/lib/auth-me";
import { fetchBranchContext, switchBranch } from "@/lib/api/branchContext";
import { resetTenantQueryCacheOnBranchSwitch } from "@/lib/reset-tenant-cache-on-branch-switch";
import { ApartmentOutlined, DownOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Dropdown } from "antd";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Active company + branch context, shown as a header chip.
 *
 * Which branch you are posting against is global operating context, so it sits in the
 * top bar next to the other workspace-wide controls rather than inside the sidebar.
 *
 * @param {{ companyName?: string }} [props]
 */
export default function BranchSwitcher({ companyName = "" }) {
  const t = useTranslations("Shell");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const contextQuery = useQuery({
    queryKey: BRANCH_CONTEXT_QUERY_KEY,
    queryFn: fetchBranchContext,
    staleTime: QUERY_STALE_TIME.default,
    refetchOnWindowFocus: true,
  });

  // Keep cookie in sync with server preference / resolved active branch (cross-device).
  useEffect(() => {
    const id = contextQuery.data?.active_branch_id;
    if (id != null) {
      setActiveBranchId(id);
    }
  }, [contextQuery.data?.active_branch_id]);

  // Keep auth/me permissions aligned when branch context is loaded/refetched.
  useEffect(() => {
    const permissions = contextQuery.data?.permissions;
    if (permissions != null) {
      applyAuthMePermissions(queryClient, permissions);
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
      name: String(b.name ?? b.id),
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
      resetTenantQueryCacheOnBranchSwitch(queryClient, {
        branchContext: data,
        permissions: data?.permissions,
      });
      message.success(t("branchSwitchSuccess"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("branchSwitchError"));
    },
  });

  const selectBranch = (value) => {
    const id = Number(value);
    if (!Number.isFinite(id) || id === activeId) return;
    const opt = options.find((o) => o.value === id);
    if (opt?.disabled) return;
    switchMutation.mutate(id);
  };

  const activeBranchName =
    options.find((o) => o.value === activeId)?.name ?? t("branchSwitcherPlaceholder");
  const loading = contextQuery.isPending || switchMutation.isPending;

  const chipBody = (
    <>
      <ApartmentOutlined className="shell-context-chip-icon" aria-hidden />
      <span className="shell-context-chip-text">
        {companyName ? (
          <>
            <span className="shell-context-chip-org">{companyName}</span>
            <span className="shell-context-chip-sep" aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span className="shell-context-chip-branch">{activeBranchName}</span>
      </span>
    </>
  );

  // No branch to choose from: keep the workspace label, drop the affordance.
  if (options.length === 0) {
    if (!companyName && contextQuery.isPending) return null;
    return (
      <span className="shell-context-chip is-static" title={companyName}>
        {chipBody}
      </span>
    );
  }

  return (
    <Dropdown
      menu={{
        items: options.map((o) => ({
          key: String(o.value),
          label: o.label,
          disabled: o.disabled,
        })),
        selectable: true,
        selectedKeys: Number.isFinite(activeId) ? [String(activeId)] : [],
        onClick: ({ key }) => selectBranch(key),
      }}
      trigger={["click"]}
      placement="bottomRight"
      disabled={loading}
    >
      <button
        type="button"
        className="shell-context-chip"
        aria-label={t("branchSwitcherAria")}
        title={`${companyName ? `${companyName} · ` : ""}${activeBranchName}`}
      >
        {chipBody}
        <DownOutlined className="shell-context-chip-caret" aria-hidden />
      </button>
    </Dropdown>
  );
}
