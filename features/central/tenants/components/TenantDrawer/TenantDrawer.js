"use client";

import { useCentralResourceAccess } from "@/lib/central-permissions";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import ResourceDrawerTabs from "@/shared/components/resource-drawer/ResourceDrawerTabs";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { fetchCentralTenant } from "../../api/tenants.api";
import { useTenantCreateMutation, useTenantUpdateMutations } from "../../queries/useTenantMutations";
import { CENTRAL_TENANTS_LIST_QUERY_KEY } from "../../queries/tenantsQueryKeys";
import {
  TENANT_CREATE_DEFAULTS,
  TENANT_CREATE_SAVE_INTENT_EVENT,
  TENANT_CREATE_SAVE_INTENT_KEY,
  isTenantCreateDirty,
  isTenantSuspended,
  tenantCreateValuesToPayload,
  toTenantCacheRow,
} from "../../utils/tenantDrawerUtils";
import TenantCreateForm from "./TenantCreateForm";
import TenantDetailsTab from "./TenantDetailsTab";
import TenantModulesTab from "./TenantModulesTab";
import TenantStatusTab from "./TenantStatusTab";

/**
 * Create: provision form. View / edit: tabs for details (rename), modules and status.
 *
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   tenantId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   tableSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function TenantDrawer({ open, mode, tenantId, onClose, onCreated, tableSeedRecord = null }) {
  const t = useTranslations("CentralTenants");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("details");
  const lastCreateIntent = usePersistedSaveIntent(TENANT_CREATE_SAVE_INTENT_KEY, TENANT_CREATE_SAVE_INTENT_EVENT);
  const tenantAccess = useCentralResourceAccess("tenants");
  const modulesAccess = useCentralResourceAccess("tenant_modules");

  const isCreate = mode === "create";
  const readOnly = mode === "view";

  const mapRecordToFormValues = useCallback(
    (r) => (mode === "create" ? TENANT_CREATE_DEFAULTS : { name: r.name ?? "" }),
    [mode],
  );
  const mapSeedToCacheRow = useCallback((seed) => toTenantCacheRow(seed), []);

  const { detailEnabled, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: tenantId,
    tableSeedRecord,
    form,
    defaults: TENANT_CREATE_DEFAULTS,
    queryKeyPrefix: CENTRAL_TENANTS_LIST_QUERY_KEY,
    fetchDetail: fetchCentralTenant,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const record =
    detailQuery.data && typeof detailQuery.data === "object"
      ? /** @type {Record<string, unknown>} */ (detailQuery.data)
      : null;

  const createMutation = useTenantCreateMutation({ form, message, t, tApiErrors, onClose, onCreated });
  const { renameMutation, statusMutation, modulesMutation } = useTenantUpdateMutations({
    tenantId,
    form,
    message,
    t,
    tApiErrors,
  });

  const submitting = createMutation.isPending || renameMutation.isPending;

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (isCreate) return isTenantCreateDirty(form);
    const name = String(form.getFieldValue("name") ?? "").trim();
    return record != null && name !== String(record.name ?? "").trim();
  }, [readOnly, isCreate, form, record]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard,
  });

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => {
          createMutation.mutate({ payload: tenantCreateValuesToPayload(values), intent });
        })
        .catch(() => {});
    },
    [form, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly || tenantId == null) return;
    form
      .validateFields()
      .then((values) => {
        renameMutation.mutate({ name: String(values.name ?? "").trim() });
      })
      .catch(() => {});
  }, [readOnly, tenantId, form, renameMutation]);

  const createIntentLabel = useCallback(
    (/** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} */ intent) => {
      if (intent === "keep") return t("drawerSave");
      if (intent === "new") return t("drawerSaveAndNew");
      return t("drawerSaveAndClose");
    },
    [t],
  );

  const createSaveMenuItems = useMemo(() => {
    /** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent[]} */
    const all = ["keep", "new", "close"];
    return all.filter((key) => key !== lastCreateIntent).map((key) => ({ key, label: createIntentLabel(key) }));
  }, [lastCreateIntent, createIntentLabel]);

  // Only the details tab has footer-level edits; modules and status save in place.
  const footerMode = isCreate ? "create" : readOnly || activeTab !== "details" ? "view" : "edit";

  const title = isCreate
    ? t("drawerTitleCreate")
    : readOnly
      ? t("drawerTitleView")
      : t("drawerTitleEdit");

  const tabItems = useMemo(() => {
    if (isCreate || tenantId == null) return [];
    const items = [
      {
        key: "details",
        label: t("tabDetails"),
        hidePanelHeading: true,
        children: <TenantDetailsTab form={form} record={record} readOnly={readOnly} t={t} />,
      },
    ];
    if (modulesAccess.canView) {
      items.push({
        key: "modules",
        label: t("tabModules"),
        panelDescription: t("tabModulesDescription"),
        children: (
          <TenantModulesTab
            tenantId={tenantId}
            canEdit={modulesAccess.canEdit}
            saving={modulesMutation.isPending}
            onSave={(modules) => modulesMutation.mutate(modules)}
            t={t}
            tApiErrors={tApiErrors}
          />
        ),
      });
    }
    items.push({
      key: "status",
      label: t("tabStatus"),
      panelDescription: t("tabStatusDescription"),
      children: (
        <TenantStatusTab
          record={record}
          canEdit={tenantAccess.canEdit}
          saving={statusMutation.isPending}
          onChangeStatus={(body) => statusMutation.mutate(body)}
          modal={modal}
          t={t}
        />
      ),
    });
    return items;
  }, [
    isCreate,
    tenantId,
    t,
    tApiErrors,
    form,
    record,
    readOnly,
    modulesAccess.canView,
    modulesAccess.canEdit,
    modulesMutation,
    tenantAccess.canEdit,
    statusMutation,
    modal,
  ]);

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={isCreate ? null : String(record?.name ?? record?.id ?? "") || null}
      statusActive={isCreate || !record ? null : !isTenantSuspended(record.status)}
      statusActiveLabel={t("statusActive")}
      statusInactiveLabel={t("statusSuspended")}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={fetchRemoteDetail && detailQuery.isPending}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={isCreate ? 520 : 640}
      footer={
        <ResourceDrawerFooter
          mode={footerMode}
          readOnly={footerMode === "view"}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          createSaveDisabled={submitting}
          lastCreateIntent={lastCreateIntent}
          runCreate={runCreate}
          createIntentLabel={createIntentLabel}
          createSaveMenuItems={createSaveMenuItems}
          handleEditSubmit={handleEditSubmit}
          canSubmitRequired
          fetchRemoteDetail={fetchRemoteDetail}
          detailEnabled={detailEnabled}
          detailQueryError={detailQuery.isError}
        />
      }
    >
      {isCreate ? (
        <TenantCreateForm form={form} t={t} />
      ) : (
        <ResourceDrawerTabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      )}
    </ResourceCrudDrawer>
  );
}
