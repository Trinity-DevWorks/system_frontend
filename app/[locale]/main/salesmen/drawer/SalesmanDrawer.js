"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import WarehouseDrawer from "@/app/[locale]/main/warehouses/drawer/WarehouseDrawer";
import { fetchBranchNames } from "@/services/branchesApi";
import { fetchSalesman } from "@/services/salesmenApi";
import { fetchTenantUserNames } from "@/services/tenantUsersApi";
import { fetchWarehouseNames } from "@/services/warehousesApi";
import { getActiveBranchId } from "@/lib/active-branch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import SalesmanAttachmentsPanel from "./SalesmanAttachmentsPanel";
import SalesmanDrawerForm from "./SalesmanDrawerForm";
import { useSalesmanDrawerMutations } from "./useSalesmanDrawerMutations";
import {
  SALESMAN_CREATE_SAVE_INTENT_EVENT,
  SALESMAN_CREATE_SAVE_INTENT_KEY,
  SALESMAN_WAREHOUSE_ADD_NEW_VALUE,
  commissionValueValid,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toSalesmanCacheRow,
} from "./salesmanDrawerUtils";

const SALESMAN_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "salesmen"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   salesmanId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SalesmanDrawer({
  open,
  mode,
  salesmanId,
  tableSeedRecord = null,
  onClose,
  onCreated,
  onCreateSuccess,
}) {
  const t = useTranslations("Salesmen");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [warehouseCreateDrawerOpen, setWarehouseCreateDrawerOpen] = useState(false);
  const lastCreateIntent = usePersistedSaveIntent(SALESMAN_CREATE_SAVE_INTENT_KEY, SALESMAN_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      salesman_code: "",
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      address: "",
      commission_type: "none",
      commission_value: undefined,
      target_amount: undefined,
      hire_date: null,
      branch_id: undefined,
      warehouse_id: undefined,
      user_id: undefined,
      is_active: true,
      notes: "",
    }),
    [],
  );

  const branchesQuery = useQuery({
    queryKey: ["tenant", "branches"],
    queryFn: fetchBranchNames,
    enabled: open,
    staleTime: 60_000,
  });

  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ["tenant", "users"],
    queryFn: fetchTenantUserNames,
    enabled: open,
    staleTime: 60_000,
  });

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branchesQuery.data) ? branchesQuery.data : [];
    return list
      .filter((row) => row && typeof row === "object" && row.is_active !== false)
      .map((row) => ({
        value: Number(row.id),
        label: String(row.name ?? row.id),
      }));
  }, [branchesQuery.data]);

  useEffect(() => {
    if (!open || mode !== "create" || readOnly) return;
    if (!Array.isArray(branchesQuery.data) || branchesQuery.data.length === 0) return;
    const current = form.getFieldValue("branch_id");
    if (current != null && current !== "") return;

    const activeId = getActiveBranchId();
    const active = activeId != null
      ? branchesQuery.data.find((b) => Number(b?.id) === activeId)
      : null;
    if (active?.id != null) {
      form.setFieldValue("branch_id", Number(active.id));
      return;
    }

    const activeBranches = branchesQuery.data.filter(
      (b) => b && typeof b === "object" && b.is_active !== false,
    );
    const defaultBranch = activeBranches.find((b) => b.is_default === true) ?? activeBranches[0] ?? null;
    if (defaultBranch?.id != null) {
      form.setFieldValue("branch_id", Number(defaultBranch.id));
    }
  }, [open, mode, readOnly, branchesQuery.data, form]);

  const branchIdWatch = Form.useWatch("branch_id", form);

  const warehouseOptions = useMemo(() => {
    const list = Array.isArray(warehousesQuery.data) ? warehousesQuery.data : [];
    const branchId = branchIdWatch == null || branchIdWatch === "" ? null : Number(branchIdWatch);
    return list
      .filter((row) => {
        if (!row || typeof row !== "object") return false;
        if (row.is_active === false) return false;
        if (branchId == null) return false;
        const whBranchId = row.branch_id == null || row.branch_id === "" ? null : Number(row.branch_id);
        return whBranchId == null || whBranchId === branchId;
      })
      .map((row) => ({
        value: Number(row.id),
        label: String(row.name ?? row.id),
      }));
  }, [warehousesQuery.data, branchIdWatch]);

  const warehouseOptionsForSelect = useMemo(() => {
    if (readOnly) return warehouseOptions;
    return [{ value: SALESMAN_WAREHOUSE_ADD_NEW_VALUE, label: t("fieldWarehouseAddNew") }, ...warehouseOptions];
  }, [readOnly, warehouseOptions, t]);

  const openWarehouseCreateDrawer = useCallback(() => {
    setWarehouseCreateDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setWarehouseCreateDrawerOpen(false);
    onClose();
  }, [onClose]);

  const nestedWarehouseDrawerOpen = open && warehouseCreateDrawerOpen;

  const handleNestedWarehouseCreated = useCallback(
    /** @param {Record<string, unknown>} record */
    (record) => {
      const id = record?.id;
      if (id == null || Number.isNaN(Number(id))) return;
      form.setFieldValue("warehouse_id", Number(id));
      queryClient.invalidateQueries({ queryKey: ["tenant", "warehouses"] });
    },
    [form, queryClient],
  );

  const userOptions = useMemo(() => {
    const list = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    return list.map((row) => ({
      value: row.id,
      label: `${row.name ?? ""}${row.email ? ` (${row.email})` : ""}`.trim() || String(row.id),
    }));
  }, [usersQuery.data]);

  const mapSeedToCacheRow = useCallback((seed) => toSalesmanCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => {
    const hire = r.hire_date;
    return {
      salesman_code: r.salesman_code ?? "",
      first_name: r.first_name ?? "",
      last_name: r.last_name ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      address: r.address ?? "",
      commission_type: String(r.commission_type ?? "none"),
      commission_value:
        r.commission_value != null && r.commission_value !== "" ? Number(r.commission_value) : undefined,
      target_amount: r.target_amount != null && r.target_amount !== "" ? Number(r.target_amount) : undefined,
      hire_date: hire ? dayjs(String(hire).slice(0, 10)) : null,
      branch_id: r.branch_id == null ? undefined : Number(r.branch_id),
      warehouse_id: r.warehouse_id == null ? undefined : Number(r.warehouse_id),
      user_id: r.user_id == null ? undefined : String(r.user_id),
      is_active: Boolean(r.is_active),
      notes: r.notes ?? "",
    };
  }, []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: salesmanId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: SALESMAN_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchSalesman,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const firstWatch = Form.useWatch("first_name", form);
  const lastWatch = Form.useWatch("last_name", form);
  const commissionTypeWatch = Form.useWatch("commission_type", form);
  const commissionValueWatch = Form.useWatch("commission_value", form);

  const canSubmitRequired = useMemo(() => {
    const fn = typeof firstWatch === "string" ? firstWatch : "";
    const ln = typeof lastWatch === "string" ? lastWatch : "";
    const ct = typeof commissionTypeWatch === "string" ? commissionTypeWatch : "none";
    return requiredFieldsValid(fn, ln, branchIdWatch) && commissionValueValid(ct, commissionValueWatch);
  }, [firstWatch, lastWatch, branchIdWatch, commissionTypeWatch, commissionValueWatch]);

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

  const { createMutation, updateMutation, applyPayload, submitting } = useSalesmanDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose: handleDrawerClose,
    onCreated,
    onCreateSuccess,
    onSyncCreateDiscardBaseline,
    defaults,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toSalesmanCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
    onClose: handleDrawerClose,
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
        if (mode === "edit" && salesmanId != null) {
          updateMutation.mutate({ id: salesmanId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, salesmanId, updateMutation]);

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
      skeletonParagraphRows={8}
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
      <SalesmanDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        branchOptions={branchOptions}
        warehouseOptions={warehouseOptionsForSelect}
        addWarehouseSentinel={readOnly ? null : SALESMAN_WAREHOUSE_ADD_NEW_VALUE}
        onOpenWarehouseDrawer={openWarehouseCreateDrawer}
        userOptions={userOptions}
        lookupsLoading={branchesQuery.isPending || warehousesQuery.isPending || usersQuery.isPending}
      />
      <SalesmanAttachmentsPanel open={open} salesmanId={salesmanId} readOnly={readOnly} />
      {!readOnly ? (
        <WarehouseDrawer
          open={nestedWarehouseDrawerOpen}
          mode="create"
          warehouseId={null}
          onClose={() => setWarehouseCreateDrawerOpen(false)}
          onCreateSuccess={handleNestedWarehouseCreated}
        />
      ) : null}
    </ResourceCrudDrawer>
  );
}
