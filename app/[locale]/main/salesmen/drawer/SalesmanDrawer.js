"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchSalesman } from "@/services/salesmenApi";
import { fetchTenantUsers } from "@/services/tenantUsersApi";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import SalesmanAttachmentsPanel from "./SalesmanAttachmentsPanel";
import SalesmanDrawerForm from "./SalesmanDrawerForm";
import { useSalesmanDrawerMutations } from "./useSalesmanDrawerMutations";
import {
  SALESMAN_CREATE_SAVE_INTENT_EVENT,
  SALESMAN_CREATE_SAVE_INTENT_KEY,
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
 *   salesmanId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SalesmanDrawer({ open, mode, salesmanId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("Salesmen");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
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
      warehouse_id: undefined,
      user_id: undefined,
      is_active: true,
      notes: "",
    }),
    [],
  );

  const lookupsQuery = useQuery({
    queryKey: ["tenant", "salesman-drawer-lookups"],
    queryFn: async () => {
      const [warehouses, users] = await Promise.all([fetchWarehouses(), fetchTenantUsers()]);
      return { warehouses, users };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const warehouseOptions = useMemo(() => {
    const w = lookupsQuery.data?.warehouses;
    const list = Array.isArray(w) ? w : [];
    return list.map((row) => ({
      value: Number(row.id),
      label: String(row.name ?? row.id),
    }));
  }, [lookupsQuery.data?.warehouses]);

  const userOptions = useMemo(() => {
    const u = lookupsQuery.data?.users;
    const list = Array.isArray(u) ? u : [];
    return list.map((row) => ({
      value: Number(row.id),
      label: `${row.name ?? ""}${row.email ? ` (${row.email})` : ""}`.trim() || String(row.id),
    }));
  }, [lookupsQuery.data?.users]);

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
      warehouse_id: r.warehouse_id == null ? undefined : Number(r.warehouse_id),
      user_id: r.user_id == null ? undefined : Number(r.user_id),
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
    return requiredFieldsValid(fn, ln) && commissionValueValid(ct, commissionValueWatch);
  }, [firstWatch, lastWatch, commissionTypeWatch, commissionValueWatch]);

  const { createMutation, updateMutation, applyPayload, submitting } = useSalesmanDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
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
    if (mode === "create") return isCreateDirtyVsDefaults(form, defaults);
    if (mode === "edit" && editBaselineForDirty) {
      return isEditDirtyVsLoaded(form, editBaselineForDirty);
    }
    if (mode === "edit") return form.isFieldsTouched(true);
    return false;
  }, [readOnly, mode, form, defaults, editBaselineForDirty]);

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
        warehouseOptions={warehouseOptions}
        userOptions={userOptions}
        lookupsLoading={lookupsQuery.isPending}
      />
      <SalesmanAttachmentsPanel open={open} salesmanId={salesmanId} readOnly={readOnly} />
    </ResourceCrudDrawer>
  );
}
