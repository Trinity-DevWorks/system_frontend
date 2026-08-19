"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerHeaderFields } from "@/components/resource-drawer/useResourceDrawerHeaderFields";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchBrand, fetchBrandNames } from "@/services/brandsApi";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  BRAND_CREATE_SAVE_INTENT_EVENT,
  BRAND_CREATE_SAVE_INTENT_KEY,
  buildParentBrandOptions,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toBrandCacheRow,
} from "./brandDrawerUtils";
import BrandDrawerForm from "./BrandDrawerForm";
import { useBrandDrawerMutations } from "./useBrandDrawerMutations";

const BRAND_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "brands"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   brandId: number | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function BrandDrawer({
  open,
  mode,
  brandId,
  onClose,
  onCreated,
  onCreateSuccess,
  editSeedRecord = null,
}) {
  const t = useTranslations("Brands");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(BRAND_CREATE_SAVE_INTENT_KEY, BRAND_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      code: "",
      name: "",
      parent_brand_id: undefined,
      is_active: true,
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toBrandCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      code: r.code,
      name: r.name,
      parent_brand_id: r.parent_brand_id ?? undefined,
      is_active: Boolean(r.is_active),
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: brandId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults,
    queryKeyPrefix: BRAND_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchBrand,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const brandsQuery = useQuery({
    queryKey: ["tenant", "brands"],
    queryFn: () => fetchBrandNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const parentBrandOptions = useMemo(
    () => buildParentBrandOptions(brandsQuery.data, mode === "edit" || mode === "view" ? brandId : null),
    [brandsQuery.data, mode, brandId],
  );

  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);

  const canSubmitRequired = useMemo(() => {
    const code = typeof codeWatch === "string" ? codeWatch : "";
    const name = typeof nameWatch === "string" ? nameWatch : "";
    return requiredFieldsValid(code, name);
  }, [codeWatch, nameWatch]);

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

  const { createMutation, updateMutation, applyPayload, submitting } = useBrandDrawerMutations({
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
    if (tableSeedMatches && editSeedRecord) {
      return toBrandCacheRow(/** @type {Record<string, unknown>} */ (editSeedRecord));
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
        if (mode === "edit" && brandId != null) {
          updateMutation.mutate({ id: brandId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, brandId, updateMutation]);

  const drawerTitle =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const detailRow =
    detailQuery.data ?? (tableSeedMatches && editSeedRecord ? editSeedRecord : null);

  const { recordName, statusActive } = useResourceDrawerHeaderFields({
    mode,
    form,
    detailRow: detailRow && typeof detailRow === "object" ? detailRow : null,
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
      <BrandDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        tApiErrors={tApiErrors}
        parentBrandOptions={parentBrandOptions}
        brandsPending={brandsQuery.isPending}
        brandsError={brandsQuery.error}
      />
    </ResourceCrudDrawer>
  );
}
