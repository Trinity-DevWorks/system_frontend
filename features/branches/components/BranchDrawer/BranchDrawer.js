"use client";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { BRANCH_CONTEXT_QUERY_KEY } from "@/lib/active-branch";
import { fetchBranch } from "../../api/branches.api";
import { fetchBranchContext } from "@/lib/api/branchContext";
import { USERS_LIST_QUERY_KEY, fetchTenantUserNames } from "@/features/users";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import BranchDrawerForm from "./BranchDrawerForm";
import { useBranchDrawerMutations } from "../../queries/useBranchMutations";
import {
  BRANCH_CREATE_SAVE_INTENT_EVENT,
  BRANCH_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  parseTimeToDayjs,
  requiredFieldsValid,
  toBranchCacheRow,
} from "../../utils/branchDrawerUtils";
import { BRANCHES_LIST_QUERY_KEY } from "../../queries/branchesQueryKeys";

const BRANCH_DETAIL_QUERY_PREFIX = /** @type {const} */ (BRANCHES_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   branchId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function BranchDrawer({
  open,
  mode,
  branchId,
  tableSeedRecord = null,
  onClose,
  onCreated,
  onCreateSuccess,
}) {
  const t = useTranslations("Branches");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(BRANCH_CREATE_SAVE_INTENT_KEY, BRANCH_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const usersQuery = useQuery({
    queryKey: USERS_LIST_QUERY_KEY,
    queryFn: fetchTenantUserNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const branchContextQuery = useQuery({
    queryKey: BRANCH_CONTEXT_QUERY_KEY,
    queryFn: fetchBranchContext,
    staleTime: 60_000,
    enabled: open,
  });

  const isOwner = Boolean(branchContextQuery.data?.is_owner);

  const userOptions = useMemo(() => {
    const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    return users
      .filter((u) => u?.id != null)
      .map((u) => ({
        value: String(u.id),
        label: typeof u.name === "string" && u.name.trim() ? u.name : String(u.email ?? u.id),
      }));
  }, [usersQuery.data]);

  const defaults = useMemo(
    () => ({
      name: "",
      shortcut_name: "",
      address: "",
      phone: "",
      email: "",
      timezone: "",
      opening_time: undefined,
      closing_time: undefined,
      manager_id: undefined,
      is_active: true,
      is_default: false,
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toBranchCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      shortcut_name: r.shortcut_name,
      address: r.address ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      timezone: r.timezone ?? "",
      opening_time: parseTimeToDayjs(r.opening_time),
      closing_time: parseTimeToDayjs(r.closing_time),
      manager_id: r.manager_id == null ? undefined : String(r.manager_id),
      is_active: Boolean(r.is_active),
      is_default: Boolean(r.is_default),
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: branchId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: BRANCH_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchBranch,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const nameWatch = Form.useWatch("name", form);
  const shortcutNameWatch = Form.useWatch("shortcut_name", form);

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const shortcutName = typeof shortcutNameWatch === "string" ? shortcutNameWatch : "";
    return requiredFieldsValid(name, shortcutName);
  }, [nameWatch, shortcutNameWatch]);

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

  const { createMutation, updateMutation, applyPayload, submitting } = useBranchDrawerMutations({
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
      return toBranchCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && branchId != null) {
          updateMutation.mutate({ id: branchId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, branchId, updateMutation]);

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
      skeletonParagraphRows={10}
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
      <BranchDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        userOptions={userOptions}
        lookupsLoading={usersQuery.isPending}
        lockDefaultStatus={!readOnly && !isOwner}
      />
    </ResourceCrudDrawer>
  );
}
