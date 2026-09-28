"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Empty, Spin, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { fetchCentralTenantModules } from "../../api/tenants.api";
import { centralTenantModulesQueryKey } from "../../queries/tenantsQueryKeys";
import {
  CORE_MODULE_CODE,
  sameModuleSet,
  sortModuleCatalog,
} from "../../utils/tenantDrawerUtils";

/**
 * Module entitlements for one tenant. `core` is always on and cannot be unchecked.
 *
 * @param {{
 *   tenantId: string;
 *   canEdit: boolean;
 *   saving: boolean;
 *   onSave: (modules: string[]) => void;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function TenantModulesTab({ tenantId, canEdit, saving, onSave, t, tApiErrors }) {
  const query = useQuery({
    queryKey: centralTenantModulesQueryKey(tenantId),
    queryFn: () => fetchCentralTenantModules(tenantId),
    staleTime: QUERY_STALE_TIME.default,
  });

  const assigned = useMemo(
    () => (Array.isArray(query.data?.modules) ? query.data.modules.map(String) : []),
    [query.data],
  );
  const catalog = useMemo(
    () => sortModuleCatalog(Array.isArray(query.data?.available) ? query.data.available : []),
    [query.data],
  );

  /** Local draft; `null` means "not edited", so a refetch repaints the checkboxes. */
  const [draft, setDraft] = useState(/** @type {string[] | null} */ (null));
  const selected = draft ?? assigned;
  const dirty = draft != null && !sameModuleSet(draft, assigned);

  if (query.isPending) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={t("modulesLoadError")}
        description={getLocalizedApiErrorMessage(tApiErrors, query.error)}
      />
    );
  }

  if (!catalog.length) {
    return <Empty description={t("modulesEmpty")} />;
  }

  const toggle = (code, checked) => {
    const base = new Set(selected);
    if (checked) base.add(code);
    else base.delete(code);
    base.add(CORE_MODULE_CODE);
    setDraft([...base]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {catalog.map((module) => {
          const code = String(module.code ?? "");
          const isCore = code === CORE_MODULE_CODE || Boolean(module.is_core);
          return (
            <div
              key={code}
              className="flex items-start gap-3 rounded-md border border-[var(--ant-color-border-secondary)] px-3 py-2"
            >
              <Checkbox
                checked={isCore || selected.includes(code)}
                disabled={!canEdit || isCore || saving}
                onChange={(e) => toggle(code, e.target.checked)}
                aria-label={String(module.name ?? code)}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <Typography.Text strong>{String(module.name ?? code)}</Typography.Text>
                  <Typography.Text type="secondary" code className="text-xs">
                    {code}
                  </Typography.Text>
                  {isCore ? <Tag className="!m-0">{t("modulesCoreTag")}</Tag> : null}
                </div>
                {module.description ? (
                  <Typography.Text type="secondary" className="text-xs">
                    {String(module.description)}
                  </Typography.Text>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {canEdit ? (
        <div className="flex justify-end gap-2">
          <Button disabled={!dirty || saving} onClick={() => setDraft(null)}>
            {t("modulesReset")}
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={!dirty}
            onClick={() => onSave(selected.filter((code) => code !== CORE_MODULE_CODE))}
          >
            {t("modulesSave")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
