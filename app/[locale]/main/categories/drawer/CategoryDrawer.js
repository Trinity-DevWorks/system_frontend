"use client";

/*
 * Category drawer: entity-specific defaults, validation, mutations, and form fields.
 * Shared drawer behavior comes from @/components/resource-drawer/* and @/lib/drawer/*.
 */

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchCategory } from "@/services/categoriesApi";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  CATEGORY_CREATE_SAVE_INTENT_EVENT,
  CATEGORY_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toCategoryCacheRow,
} from "./categoryDrawerUtils";
import CategoryDrawerForm from "./CategoryDrawerForm";
import { useCategoryDrawerMutations } from "./useCategoryDrawerMutations";

const CATEGORY_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "categories"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   categoryId: number | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function CategoryDrawer({ open, mode, categoryId, onClose, onCreated, editSeedRecord = null }) {
  const t = useTranslations("Categories");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(CATEGORY_CREATE_SAVE_INTENT_KEY, CATEGORY_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      code: "",
      name: "",
      color: "#6366F1",
      description: "",
      is_active: true,
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toCategoryCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      code: r.code,
      name: r.name,
      color: r.color,
      description: r.description ?? "",
      is_active: Boolean(r.is_active),
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: categoryId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults,
    queryKeyPrefix: CATEGORY_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchCategory,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);
  const colorWatch = Form.useWatch("color", form);

  const canSubmitRequired = useMemo(() => {
    const code = typeof codeWatch === "string" ? codeWatch : "";
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const color = typeof colorWatch === "string" ? colorWatch : "";
    return requiredFieldsValid(code, name, color);
  }, [codeWatch, nameWatch, colorWatch]);

  const { createMutation, updateMutation, applyPayload, submitting } = useCategoryDrawerMutations({
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
    if (tableSeedMatches && editSeedRecord) {
      return toCategoryCacheRow(/** @type {Record<string, unknown>} */ (editSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, editSeedRecord]);

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
        if (mode === "edit" && categoryId != null) {
          updateMutation.mutate({ id: categoryId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, categoryId, updateMutation]);

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
      <CategoryDrawerForm form={form} readOnly={readOnly} t={t} />
    </ResourceCrudDrawer>
  );
}
