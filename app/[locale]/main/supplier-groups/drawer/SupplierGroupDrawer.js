"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchSupplierGroup } from "@/services/supplierGroupsApi";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import SupplierGroupDrawerForm from "./SupplierGroupDrawerForm";
import { useSupplierGroupDrawerMutations } from "./useSupplierGroupDrawerMutations";
import {
  SUPPLIER_GROUP_CREATE_SAVE_INTENT_EVENT,
  SUPPLIER_GROUP_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toSupplierGroupCacheRow,
} from "./supplierGroupDrawerUtils";

const SUPPLIER_GROUP_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "supplier-groups"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   supplierGroupId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SupplierGroupDrawer({
  open,
  mode,
  supplierGroupId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("SupplierGroups");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    SUPPLIER_GROUP_CREATE_SAVE_INTENT_KEY,
    SUPPLIER_GROUP_CREATE_SAVE_INTENT_EVENT,
  );

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      code: "",
      name: "",
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toSupplierGroupCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      code: r.code,
      name: r.name,
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: supplierGroupId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: SUPPLIER_GROUP_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchSupplierGroup,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);

  const canSubmitRequired = useMemo(() => {
    const code = typeof codeWatch === "string" ? codeWatch : "";
    const name = typeof nameWatch === "string" ? nameWatch : "";
    return requiredFieldsValid(code, name);
  }, [codeWatch, nameWatch]);

  const { createMutation, updateMutation, applyPayload, submitting } = useSupplierGroupDrawerMutations({
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
      return toSupplierGroupCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && supplierGroupId != null) {
          updateMutation.mutate({ id: supplierGroupId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, supplierGroupId, updateMutation]);

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
      skeletonParagraphRows={5}
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
      <SupplierGroupDrawerForm form={form} readOnly={readOnly} t={t} />
    </ResourceCrudDrawer>
  );
}
