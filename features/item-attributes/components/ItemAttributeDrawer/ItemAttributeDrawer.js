"use client";

import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { useResourceDrawerHeaderFields } from "@/shared/components/resource-drawer/useResourceDrawerHeaderFields";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { fetchItemAttribute } from "../../api/itemAttributes.api";
import { ITEM_ATTRIBUTES_LIST_QUERY_KEY } from "../../queries/itemAttributesQueryKeys";
import { useItemAttributeMutations } from "../../queries/useItemAttributeMutations";
import {
  ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_EVENT,
  ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_KEY,
  ITEM_ATTRIBUTE_DEFAULTS,
  isItemAttributeDirty,
  mapItemAttributeToFormValues,
  requiredFieldsValid,
  toItemAttributeCacheRow,
} from "../../utils/itemAttributeDrawerUtils";
import ItemAttributeDrawerForm from "./ItemAttributeDrawerForm";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   itemAttributeId: number | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function ItemAttributeDrawer({ open, mode, itemAttributeId, onClose, onCreated, onCreateSuccess, editSeedRecord = null }) {
  const t = useTranslations("ItemAttributes");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_KEY, ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_EVENT);
  const readOnly = mode === "view";
  const defaults = ITEM_ATTRIBUTE_DEFAULTS;

  const mapSeedToCacheRow = useCallback((seed) => toItemAttributeCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => mapItemAttributeToFormValues(r), []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: itemAttributeId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults,
    queryKeyPrefix: ITEM_ATTRIBUTES_LIST_QUERY_KEY,
    fetchDetail: fetchItemAttribute,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);
  const canSubmitRequired = useMemo(() => requiredFieldsValid(codeWatch, nameWatch), [codeWatch, nameWatch]);

  const { syncBaselineFromFormFields, resetBaselineToDefaults, isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults,
    isCreateDirtyVsBaseline: isItemAttributeDirty,
  });

  const onSyncCreateDiscardBaseline = useCallback(
    (kind) => (kind === "fromForm" ? syncBaselineFromFormFields() : resetBaselineToDefaults()),
    [syncBaselineFromFormFields, resetBaselineToDefaults],
  );

  const { createMutation, updateMutation, applyPayload, submitting } = useItemAttributeMutations({
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

  const detailRow = detailQuery.data ?? (tableSeedMatches && editSeedRecord ? editSeedRecord : null);

  // Whole form (incl. value rows), so Save changes turns on only after a real edit.
  const watchedValues = Form.useWatch([], { form, preserve: true });
  const isEditDirty = useMemo(
    () =>
      mode === "edit" && detailRow && watchedValues
        ? isItemAttributeDirty({ getFieldsValue: () => watchedValues }, /** @type {Record<string, any>} */ (detailRow))
        : false,
    [mode, detailRow, watchedValues],
  );

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (detailRow) return isItemAttributeDirty(form, /** @type {Record<string, any>} */ (detailRow));
    return form.isFieldsTouched(true);
  }, [readOnly, mode, form, isCreateDirty, detailRow]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose, shouldConfirmDiscard });

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => createMutation.mutate({ payload: applyPayload(values), intent }))
        .catch(() => {});
    },
    [form, applyPayload, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly || mode !== "edit" || itemAttributeId == null) return;
    form
      .validateFields()
      .then((values) => updateMutation.mutate({ id: itemAttributeId, values: applyPayload(values) }))
      .catch(() => {});
  }, [readOnly, mode, itemAttributeId, form, applyPayload, updateMutation]);

  const { recordName } = useResourceDrawerHeaderFields({
    mode,
    form,
    detailRow: detailRow && typeof detailRow === "object" ? detailRow : null,
    seedRow: editSeedRecord,
  });

  const createIntentLabel = useCallback(
    (intent) => (intent === "keep" ? t("drawerSave") : intent === "new" ? t("drawerSaveAndNew") : t("drawerSaveAndClose")),
    [t],
  );
  const createSaveMenuItems = useMemo(
    () =>
      ["keep", "new", "close"]
        .filter((key) => key !== lastCreateIntent)
        .map((key) => ({ key, label: createIntentLabel(key) })),
    [lastCreateIntent, createIntentLabel],
  );

  const detailFailed = Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError);
  const drawerTitle = mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  return (
    <ResourceCrudDrawer
      title={drawerTitle}
      recordName={recordName}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      size={760}
      showDetailLoading={fetchRemoteDetail && detailQuery.isPending}
      detailLoadFailed={detailFailed}
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
          createSaveDisabled={!canSubmitRequired || submitting || detailFailed}
          lastCreateIntent={lastCreateIntent}
          runCreate={runCreate}
          createIntentLabel={createIntentLabel}
          createSaveMenuItems={createSaveMenuItems}
          handleEditSubmit={handleEditSubmit}
          editSaveDisabled={!isEditDirty || !canSubmitRequired || detailFailed}
          canSubmitRequired={canSubmitRequired}
          fetchRemoteDetail={fetchRemoteDetail}
          detailEnabled={detailEnabled}
          detailQueryError={detailQuery.isError}
        />
      }
    >
      <ItemAttributeDrawerForm form={form} readOnly={readOnly} t={t} />
    </ResourceCrudDrawer>
  );
}
