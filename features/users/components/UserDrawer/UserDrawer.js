"use client";

import UserAvatarSection from "../UserAvatarSection";
import BranchDrawer from "@/features/branches/components/BranchDrawer/BranchDrawer";
import RoleDrawer from "@/features/roles/components/RoleDrawer/RoleDrawer";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchTenantUser } from "../../api/tenantUsers.api";
import { useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import {
  USER_CREATE_SAVE_INTENT_EVENT,
  USER_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toUserCacheRow,
} from "../../utils/userDrawerUtils";
import UserDrawerForm from "./UserDrawerForm";
import { useUserDrawerMutations } from "../../queries/useUserMutations";
import { USERS_LIST_QUERY_KEY } from "../../queries/tenantUsersQueryKeys";
import { BRANCHES_LIST_QUERY_KEY } from "@/features/branches";
import { ROLES_LIST_QUERY_KEY } from "@/features/roles";
import { AUTH_ME_QUERY_KEY } from "@/lib/auth-me";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";

const USER_DETAIL_QUERY_PREFIX = /** @type {const} */ (USERS_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   userId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function UserDrawer({ open, mode, userId, onClose, onCreated, editSeedRecord = null }) {
  const t = useTranslations("Users");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(USER_CREATE_SAVE_INTENT_KEY, USER_CREATE_SAVE_INTENT_EVENT);
  /** @type {[null | { type: "branch" | "role"; rowIndex: number }, Function]} */
  const [nestedCreate, setNestedCreate] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(/** @type {File | null} */ (null));

  if ((!open || mode !== "create") && pendingAvatarFile != null) {
    setPendingAvatarFile(null);
  }

  const readOnly = mode === "view";
  const clearPendingAvatar = useCallback(() => setPendingAvatarFile(null), []);

  const defaults = useMemo(
    () => ({
      name: "",
      email: "",
      phone: "",
      branch_assignments: [],
      is_active: true,
      password: "",
      password_confirmation: "",
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toUserCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      email: r.email,
      phone: typeof r.phone === "string" ? r.phone : "",
      branch_assignments: Array.isArray(r.branch_assignments)
        ? r.branch_assignments.map((row) => ({
            branch_id: Number(row?.branch_id),
            role_id: Number(row?.role_id),
          }))
        : Array.isArray(r.branches)
          ? r.branches
              .map((branch) => ({
                branch_id: Number(branch?.id),
                role_id: Number(branch?.role_id ?? branch?.role?.id),
              }))
              .filter((row) => !Number.isNaN(row.branch_id) && !Number.isNaN(row.role_id))
          : [],
      is_active: Boolean(r.is_active),
      password: "",
      password_confirmation: "",
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: userId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults,
    queryKeyPrefix: USER_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchTenantUser,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const nameWatch = Form.useWatch("name", form);
  const emailWatch = Form.useWatch("email", form);
  const branchAssignmentsWatch = Form.useWatch("branch_assignments", form);
  const passwordWatch = Form.useWatch("password", form);
  const passwordConfirmationWatch = Form.useWatch("password_confirmation", form);

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const email = typeof emailWatch === "string" ? emailWatch : "";
    const password = typeof passwordWatch === "string" ? passwordWatch : "";
    const passwordConfirmation =
      typeof passwordConfirmationWatch === "string" ? passwordConfirmationWatch : "";
    return requiredFieldsValid(
      name,
      email,
      branchAssignmentsWatch,
      mode === "create" ? "create" : "edit",
      password,
      passwordConfirmation,
    );
  }, [nameWatch, emailWatch, branchAssignmentsWatch, passwordWatch, passwordConfirmationWatch, mode]);

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

  const closeNestedCreate = useCallback(() => setNestedCreate(null), []);

  const handleDrawerClose = useCallback(() => {
    setNestedCreate(null);
    onClose();
  }, [onClose]);

  const { createMutation, updateMutation, applyPayload, submitting } = useUserDrawerMutations({
    form,
    mode,
    message,
    t,
    tApiErrors,
    onClose: handleDrawerClose,
    onCreated,
    onSyncCreateDiscardBaseline,
    defaults,
    onPendingAvatarCleared: clearPendingAvatar,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && editSeedRecord) {
      return toUserCacheRow(/** @type {Record<string, unknown>} */ (editSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, editSeedRecord]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty() || pendingAvatarFile != null;
    if (mode === "edit" && editBaselineForDirty) {
      return isEditDirtyVsLoaded(form, editBaselineForDirty);
    }
    if (mode === "edit") return form.isFieldsTouched(true);
    return false;
  }, [readOnly, mode, form, isCreateDirty, editBaselineForDirty, pendingAvatarFile]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: handleDrawerClose,
    shouldConfirmDiscard,
  });

  const handleNestedBranchCreated = useCallback(
    /** @param {Record<string, unknown>} record */
    (record) => {
      const id = record?.id;
      const rowIndex = nestedCreate?.type === "branch" ? nestedCreate.rowIndex : null;
      if (id == null || Number.isNaN(Number(id)) || rowIndex == null) return;
      form.setFieldValue(["branch_assignments", rowIndex, "branch_id"], Number(id));
      invalidateTenantListQueries(queryClient, BRANCHES_LIST_QUERY_KEY);
      setNestedCreate(null);
    },
    [form, nestedCreate, queryClient],
  );

  const handleNestedRoleCreated = useCallback(
    /** @param {Record<string, unknown>} record */
    (record) => {
      const id = record?.id;
      const rowIndex = nestedCreate?.type === "role" ? nestedCreate.rowIndex : null;
      if (id == null || Number.isNaN(Number(id)) || rowIndex == null) return;
      form.setFieldValue(["branch_assignments", rowIndex, "role_id"], Number(id));
      invalidateTenantListQueries(queryClient, ROLES_LIST_QUERY_KEY);
      setNestedCreate(null);
    },
    [form, nestedCreate, queryClient],
  );

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => {
          const payload = applyPayload(values);
          createMutation.mutate({ payload, intent, pendingAvatarFile });
        })
        .catch(() => {});
    },
    [form, applyPayload, createMutation, pendingAvatarFile],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly) return;
    form
      .validateFields()
      .then((values) => {
        const payload = applyPayload(values);
        if (mode === "edit" && userId != null) {
          updateMutation.mutate({ id: userId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, userId, updateMutation]);

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

  const nestedBranchOpen = open && nestedCreate?.type === "branch";
  const nestedRoleOpen = open && nestedCreate?.type === "role";

  const detailRecord =
    detailQuery.data && typeof detailQuery.data === "object"
      ? /** @type {Record<string, unknown>} */ (detailQuery.data)
      : editSeedRecord && typeof editSeedRecord === "object"
        ? editSeedRecord
        : null;
  const avatarBrief =
    detailRecord?.avatar && typeof detailRecord.avatar === "object"
      ? /** @type {{ id: string, file_name?: string, mime_type?: string }} */ (detailRecord.avatar)
      : null;

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
      {mode === "create" || userId ? (
        <div className="mb-4">
          <UserAvatarSection
            userId={mode === "create" ? null : userId}
            avatar={mode === "create" ? null : avatarBrief}
            pendingFile={mode === "create" ? pendingAvatarFile : null}
            onPendingFileChange={mode === "create" ? setPendingAvatarFile : undefined}
            invalidateQueryKeys={[USERS_LIST_QUERY_KEY, AUTH_ME_QUERY_KEY]}
            t={t}
            tApiErrors={tApiErrors}
            readOnly={readOnly}
            size={72}
          />
        </div>
      ) : null}
      <UserDrawerForm
        form={form}
        readOnly={readOnly}
        mode={mode}
        open={open}
        t={t}
        onOpenBranchCreate={readOnly ? undefined : (rowIndex) => setNestedCreate({ type: "branch", rowIndex })}
        onOpenRoleCreate={readOnly ? undefined : (rowIndex) => setNestedCreate({ type: "role", rowIndex })}
      />
      {!readOnly ? (
        <>
          <BranchDrawer
            open={Boolean(nestedBranchOpen)}
            mode="create"
            branchId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={handleNestedBranchCreated}
          />
          <RoleDrawer
            open={Boolean(nestedRoleOpen)}
            mode="create"
            roleId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={handleNestedRoleCreated}
          />
        </>
      ) : null}
    </ResourceCrudDrawer>
  );
}
