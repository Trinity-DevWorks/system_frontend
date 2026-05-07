"use client";

/*
 * Sub-category drawer: entity-specific defaults, validation, mutations, category dropdown, and form fields.
 * Shared drawer behavior comes from @/components/resource-drawer/* and @/lib/drawer/*.
 */

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchCategories } from "@/services/categoriesApi";
import { fetchSubCategory } from "@/services/subCategoriesApi";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  SUB_CATEGORY_CREATE_SAVE_INTENT_EVENT,
  SUB_CATEGORY_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toSubCategoryCacheRow,
} from "./subCategoryDrawerUtils";
import SubCategoryDrawerForm from "./SubCategoryDrawerForm";
import { useSubCategoryDrawerMutations } from "./useSubCategoryDrawerMutations";

const SUB_CATEGORY_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "sub-categories"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   subCategoryId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SubCategoryDrawer({ open, mode, subCategoryId, onClose, onCreated, tableSeedRecord = null }) {
  const t = useTranslations("SubCategories");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    SUB_CATEGORY_CREATE_SAVE_INTENT_KEY,
    SUB_CATEGORY_CREATE_SAVE_INTENT_EVENT,
  );

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      category_id: undefined,
      name: "",
      color: "#6366F1",
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toSubCategoryCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      category_id: r.category_id,
      name: r.name,
      color: r.color,
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: subCategoryId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: SUB_CATEGORY_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchSubCategory,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const categoriesQuery = useQuery({
    queryKey: ["tenant", "categories"],
    queryFn: () => fetchCategories(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const categoryOptions = useMemo(() => {
    const rows = categoriesQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      value: row.id,
      label: typeof row.name === "string" ? row.name : String(row.id),
    }));
  }, [categoriesQuery.data]);

  const categoryIdWatch = Form.useWatch("category_id", form);
  const nameWatch = Form.useWatch("name", form);
  const colorWatch = Form.useWatch("color", form);

  const canSubmitRequired = useMemo(() => {
    const cid =
      typeof categoryIdWatch === "number"
        ? categoryIdWatch
        : categoryIdWatch != null
          ? Number(categoryIdWatch)
          : undefined;
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const color = typeof colorWatch === "string" ? colorWatch : "";
    return requiredFieldsValid(cid, name, color);
  }, [categoryIdWatch, nameWatch, colorWatch]);

  const categoriesData = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : undefined;

  const { createMutation, updateMutation, applyPayload, submitting } = useSubCategoryDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    defaults,
    categoriesData,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toSubCategoryCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && subCategoryId != null) {
          updateMutation.mutate({ id: subCategoryId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, subCategoryId, updateMutation]);

  const title =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isPending;

  const createSaveDisabled =
    !canSubmitRequired ||
    submitting ||
    (mode === "create" && categoriesQuery.isError) ||
    (fetchRemoteDetail && detailEnabled && detailQuery.isError);

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
      <SubCategoryDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        tApiErrors={tApiErrors}
        categoryOptions={categoryOptions}
        categoriesPending={categoriesQuery.isPending}
        categoriesError={categoriesQuery.isError ? categoriesQuery.error : null}
      />
    </ResourceCrudDrawer>
  );
}
