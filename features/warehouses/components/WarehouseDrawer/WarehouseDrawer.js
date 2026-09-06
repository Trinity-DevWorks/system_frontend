"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { BRANCHES_LIST_QUERY_KEY, fetchBranchNames } from "@/features/branches";
import { USERS_LIST_QUERY_KEY, fetchTenantUserNames } from "@/features/users";
import { fetchWarehouse } from "../../api/warehouses.api";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import WarehouseDrawerForm from "./WarehouseDrawerForm";
import { useWarehouseDrawerMutations } from "../../queries/useWarehouseMutations";
import {
  WAREHOUSE_CREATE_SAVE_INTENT_EVENT,
  WAREHOUSE_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toWarehouseCacheRow,
} from "../../utils/warehouseDrawerUtils";
import { WAREHOUSES_LIST_QUERY_KEY } from "../../queries/warehousesQueryKeys";

const WAREHOUSE_DETAIL_QUERY_PREFIX = /** @type {const} */ (WAREHOUSES_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   warehouseId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function WarehouseDrawer({
  open,
  mode,
  warehouseId,
  tableSeedRecord = null,
  onClose,
  onCreated,
  onCreateSuccess,
}) {
  const t = useTranslations("Warehouses");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(WAREHOUSE_CREATE_SAVE_INTENT_KEY, WAREHOUSE_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const branchesQuery = useQuery({
    queryKey: BRANCHES_LIST_QUERY_KEY,
    queryFn: fetchBranchNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const usersQuery = useQuery({
    queryKey: USERS_LIST_QUERY_KEY,
    queryFn: fetchTenantUserNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const branchOptions = useMemo(() => {
    const branches = Array.isArray(branchesQuery.data) ? branchesQuery.data : [];
    return branches
      .filter((b) => b?.id != null && b?.is_active !== false)
      .map((b) => ({
        value: Number(b.id),
        label: typeof b.name === "string" && b.name.trim() ? b.name : String(b.id),
      }));
  }, [branchesQuery.data]);

  const typeWatch = Form.useWatch("type", form);
  const branchIdWatch = Form.useWatch("branch_id", form);

  const userOptions = useMemo(() => {
    const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    const isBranchType = typeWatch === "branch";
    const branchId =
      branchIdWatch == null || branchIdWatch === "" ? null : Number(branchIdWatch);

    return users
      .filter((u) => {
        if (u?.id == null) return false;
        if (!isBranchType) return true;
        if (branchId == null) return false;
        const ids = Array.isArray(u.branch_ids)
          ? u.branch_ids.map(Number)
          : Array.isArray(u.branches)
            ? u.branches.map((b) => Number(b?.id)).filter((id) => !Number.isNaN(id))
            : [];
        return ids.includes(branchId);
      })
      .map((u) => ({
        value: String(u.id),
        label: typeof u.name === "string" && u.name.trim() ? u.name : String(u.email ?? u.id),
      }));
  }, [usersQuery.data, typeWatch, branchIdWatch]);

  const defaults = useMemo(
    () => ({
      name: "",
      shortcut_name: "",
      type: "central",
      branch_id: undefined,
      address: "",
      description: "",
      manager_id: undefined,
      is_active: true,
      is_default: false,
      is_default_sales: false,
      is_default_production: false,
      is_default_purchase: false,
      is_default_storage: false,
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toWarehouseCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      shortcut_name: r.shortcut_name,
      type: r.type ?? "central",
      branch_id: r.branch_id == null ? undefined : Number(r.branch_id),
      address: r.address ?? "",
      description: r.description ?? "",
      manager_id: r.manager_id == null ? undefined : String(r.manager_id),
      is_active: Boolean(r.is_active),
      is_default: Boolean(r.is_default),
      is_default_sales: Boolean(r.is_default_sales),
      is_default_production: Boolean(r.is_default_production),
      is_default_purchase: Boolean(r.is_default_purchase),
      is_default_storage: Boolean(r.is_default_storage),
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: warehouseId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: WAREHOUSE_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchWarehouse,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const nameWatch = Form.useWatch("name", form);
  const shortcutNameWatch = Form.useWatch("shortcut_name", form);

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const shortcutName = typeof shortcutNameWatch === "string" ? shortcutNameWatch : "";
    return requiredFieldsValid(name, shortcutName, typeWatch, branchIdWatch);
  }, [nameWatch, shortcutNameWatch, typeWatch, branchIdWatch]);

  const { syncBaselineFromFormFields, resetBaselineToDefaults, isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: isCreateDirtyVsDefaults,
  });

  const onSyncCreateDiscardBaseline = useCallback(
    /** @param {"fromForm" | "defaults"} kind */
    (kind) => {
      if (kind === "fromForm") syncBaselineFromFormFields();
      else resetBaselineToDefaults();
    },
    [syncBaselineFromFormFields, resetBaselineToDefaults],
  );

  const { createMutation, updateMutation, applyPayload, submitting } = useWarehouseDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    onCreateSuccess,
    onSyncCreateDiscardBaseline,
    defaults,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toWarehouseCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, tableSeedRecord]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (mode === "edit" && editBaselineForDirty) {
      return isEditDirtyVsLoaded(form, editBaselineForDirty);
    }
    if (mode === "edit") return form.isFieldsTouched(true);
    return false;
  }, [readOnly, mode, form, isCreateDirty, editBaselineForDirty]);

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
          const payload = applyPayload(values);
          createMutation.mutate({ payload, intent });
        })
        .catch(() => {});
    },
    [form, applyPayload, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly) return;
    form
      .validateFields()
      .then((values) => {
        const payload = applyPayload(values);
        if (mode === "edit" && warehouseId != null) {
          updateMutation.mutate({ id: warehouseId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, warehouseId, updateMutation]);

  const title =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isPending;

  const createSaveDisabled =
    !canSubmitRequired || submitting || (fetchRemoteDetail && detailEnabled && detailQuery.isError);

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
    return all
      .filter((key) => key !== lastCreateIntent)
      .map((key) => ({
        key,
        label: createIntentLabel(key),
      }));
  }, [lastCreateIntent, createIntentLabel]);

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <ResourceDrawerFooter
          mode={mode}
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          createSaveDisabled={createSaveDisabled}
          lastCreateIntent={lastCreateIntent}
          runCreate={runCreate}
          createIntentLabel={createIntentLabel}
          createSaveMenuItems={createSaveMenuItems}
          handleEditSubmit={handleEditSubmit}
          canSubmitRequired={canSubmitRequired}
          fetchRemoteDetail={fetchRemoteDetail}
          detailEnabled={detailEnabled}
          detailQueryError={detailQuery.isError}
        />
      }
    >
      <WarehouseDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        branchOptions={branchOptions}
        userOptions={userOptions}
        lookupsLoading={branchesQuery.isPending || usersQuery.isPending}
      />
    </ResourceCrudDrawer>
  );
}
