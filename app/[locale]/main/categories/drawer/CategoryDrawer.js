"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerHeaderFields } from "@/components/resource-drawer/useResourceDrawerHeaderFields";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchCategory, fetchCategoryNames } from "@/services/categoriesApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/app-theme";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
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
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 *   defaultParentId?: number | null;
 * }} props
 */
export default function CategoryDrawer({
  open,
  mode,
  categoryId,
  onClose,
  onCreated,
  onCreateSuccess,
  editSeedRecord = null,
  defaultParentId = null,
}) {
  const t = useTranslations("Categories");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [parentCreateDrawerOpen, setParentCreateDrawerOpen] = useState(false);
  const lastCreateIntent = usePersistedSaveIntent(CATEGORY_CREATE_SAVE_INTENT_KEY, CATEGORY_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const closeParentCreateDrawer = useCallback(() => setParentCreateDrawerOpen(false), []);

  const handleDrawerClose = useCallback(() => {
    setParentCreateDrawerOpen(false);
    onClose();
  }, [onClose]);

  const nestedParentDrawerOpen = open && parentCreateDrawerOpen;

  const handleNestedParentCreated = useCallback(
    /** @param {Record<string, unknown>} record */
    (record) => {
      const id = record?.id;
      if (id == null || Number.isNaN(Number(id))) return;
      form.setFieldValue("parent_id", Number(id));
      queryClient.invalidateQueries({ queryKey: ["tenant", "categories"] });
    },
    [form, queryClient],
  );

  const defaults = useMemo(
    () => ({
      parent_id: defaultParentId ?? undefined,
      code: "",
      name: "",
      color: DEFAULT_CATEGORY_COLOR,
      description: "",
      is_active: true,
    }),
    [defaultParentId],
  );

  const mapSeedToCacheRow = useCallback((seed) => toCategoryCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      parent_id: r.parent_id ?? undefined,
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

  const categoriesQuery = useQuery({
    queryKey: ["tenant", "categories"],
    queryFn: () => fetchCategoryNames(),
    enabled: open,
    staleTime: 5 * 60_000,
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

  const { createMutation, updateMutation, applyPayload, submitting } = useCategoryDrawerMutations({
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
    if (tableSeedMatches && editSeedRecord) {
      return toCategoryCacheRow(/** @type {Record<string, unknown>} */ (editSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, editSeedRecord]);

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
        if (mode === "edit" && categoryId != null) {
          updateMutation.mutate({ id: categoryId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, categoryId, updateMutation]);

  const drawerTitle =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const categoryDetailRow =
    detailQuery.data ?? (tableSeedMatches && editSeedRecord ? editSeedRecord : null);

  const { recordName, statusActive } = useResourceDrawerHeaderFields({
    mode,
    form,
    detailRow: categoryDetailRow && typeof categoryDetailRow === "object" ? categoryDetailRow : null,
    seedRow: editSeedRecord,
  });

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
      title={drawerTitle}
      recordName={recordName}
      statusActive={statusActive}
      statusActiveLabel={t("statusActive")}
      statusInactiveLabel={t("statusInactive")}
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
      <CategoryDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        categories={categoriesQuery.data ?? []}
        categoriesPending={categoriesQuery.isPending}
        excludeCategoryId={mode === "edit" || mode === "view" ? categoryId : null}
        onOpenParentCategoryDrawer={readOnly ? undefined : () => setParentCreateDrawerOpen(true)}
      />
      {!readOnly ? (
        <CategoryDrawer
          open={nestedParentDrawerOpen}
          mode="create"
          categoryId={null}
          onClose={closeParentCreateDrawer}
          onCreateSuccess={handleNestedParentCreated}
        />
      ) : null}
    </ResourceCrudDrawer>
  );
}
