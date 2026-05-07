"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchSupplierGroups } from "@/services/supplierGroupsApi";
import { fetchSupplier } from "@/services/suppliersApi";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import SupplierDrawerForm from "./SupplierDrawerForm";
import {
  SUPPLIER_CREATE_SAVE_INTENT_EVENT,
  SUPPLIER_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toSupplierCacheRow,
} from "./supplierDrawerUtils";
import { useSupplierDrawerMutations } from "./useSupplierDrawerMutations";

const SUPPLIER_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "suppliers"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   supplierId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SupplierDrawer({
  open,
  mode,
  supplierId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Suppliers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(SUPPLIER_CREATE_SAVE_INTENT_KEY, SUPPLIER_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      name: "",
      email: "",
      phone: "",
      supplier_group_id: undefined,
      credit_limit: 0,
      opening_balance: 0,
      is_active: true,
      is_vat_registered: false,
      vat_number: "",
      notes: "",
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toSupplierCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      supplier_code: r.supplier_code,
      name: r.name,
      email: r.email ?? "",
      phone: r.phone ?? "",
      supplier_group_id: r.supplier_group_id ?? undefined,
      credit_limit: Number(r.credit_limit ?? 0),
      opening_balance: Number(r.opening_balance ?? 0),
      is_active: r.is_active !== false,
      is_vat_registered: r.is_vat_registered === true,
      vat_number: r.vat_number ?? "",
      notes: r.notes ?? "",
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: supplierId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: SUPPLIER_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchSupplier,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const supplierGroupsQuery = useQuery({
    queryKey: ["tenant", "supplier-groups"],
    queryFn: () => fetchSupplierGroups(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const supplierGroupOptions = useMemo(() => {
    const rows = supplierGroupsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name ?? row.id}${row.code ? ` (${row.code})` : ""}`,
    }));
  }, [supplierGroupsQuery.data]);

  const nameWatch = Form.useWatch("name", form);

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    return requiredFieldsValid(name);
  }, [nameWatch]);

  const supplierGroupsData = Array.isArray(supplierGroupsQuery.data) ? supplierGroupsQuery.data : undefined;

  const { createMutation, updateMutation, toCreatePayload, toUpdatePayload, submitting } = useSupplierDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    defaults,
    supplierGroupsData,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toSupplierCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
          const payload = toCreatePayload(values);
          createMutation.mutate({ payload, intent });
        })
        .catch(() => {});
    },
    [form, toCreatePayload, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly) return;
    form
      .validateFields()
      .then((values) => {
        const payload = toUpdatePayload(values);
        if (mode === "edit" && supplierId != null) {
          updateMutation.mutate({ id: supplierId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, toUpdatePayload, mode, supplierId, updateMutation]);

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
      skeletonParagraphRows={6}
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
      <SupplierDrawerForm
        form={form}
        mode={mode}
        readOnly={readOnly}
        t={t}
        tApiErrors={tApiErrors}
        supplierGroupOptions={supplierGroupOptions}
        supplierGroupsPending={supplierGroupsQuery.isPending}
        supplierGroupsError={supplierGroupsQuery.isError ? supplierGroupsQuery.error : null}
      />
    </ResourceCrudDrawer>
  );
}
