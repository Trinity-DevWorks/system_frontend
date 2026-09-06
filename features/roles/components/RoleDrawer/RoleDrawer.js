"use client";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchRole } from "../../api/roles.api";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  ROLE_CREATE_SAVE_INTENT_EVENT,
  ROLE_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  isOwnerRoleName,
  isSystemRoleName,
  requiredFieldsValid,
  toRoleCacheRow,
} from "../../utils/roleDrawerUtils";
import RoleDrawerForm from "./RoleDrawerForm";
import { useRoleDrawerMutations } from "../../queries/useRoleMutations";
import { ROLES_LIST_QUERY_KEY } from "../../queries/rolesQueryKeys";

const ROLE_DETAIL_QUERY_PREFIX = /** @type {const} */ (ROLES_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   roleId: number | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function RoleDrawer({ open, mode, roleId, onClose, onCreated, onCreateSuccess, editSeedRecord = null }) {
  const t = useTranslations("Roles");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(ROLE_CREATE_SAVE_INTENT_KEY, ROLE_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      name: "",
      description: "",
      is_active: true,
    }),
    [],
  );

  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      description: r.description ?? "",
      is_active: Boolean(r.is_active),
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toRoleCacheRow(seed), []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: roleId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults,
    queryKeyPrefix: ROLE_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchRole,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const nameWatch = Form.useWatch("name", form);
  const canSubmitRequired = useMemo(() => requiredFieldsValid(typeof nameWatch === "string" ? nameWatch : ""), [nameWatch]);

  const systemRole = useMemo(() => {
    if (mode === "create") return false;
    const loadedName =
      typeof detailQuery.data?.name === "string"
        ? detailQuery.data.name
        : typeof editSeedRecord?.name === "string"
          ? editSeedRecord.name
          : "";
    return isSystemRoleName(loadedName);
  }, [mode, detailQuery.data, editSeedRecord]);

  const ownerRole = useMemo(() => {
    if (mode === "create") return false;
    const loadedName =
      typeof detailQuery.data?.name === "string"
        ? detailQuery.data.name
        : typeof editSeedRecord?.name === "string"
          ? editSeedRecord.name
          : "";
    return isOwnerRoleName(loadedName);
  }, [mode, detailQuery.data, editSeedRecord]);

  // Owner is immutable even if opened in edit mode (API / deep-link safety).
  const effectiveReadOnly = readOnly || ownerRole;
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

  const { createMutation, updateMutation, applyPayload, submitting } = useRoleDrawerMutations({
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
    if (detailQuery.data) return toRoleCacheRow(/** @type {Record<string, unknown>} */ (detailQuery.data));
    if (tableSeedMatches && editSeedRecord) {
      return toRoleCacheRow(/** @type {Record<string, unknown>} */ (editSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, editSeedRecord]);

  const shouldConfirmDiscard = useCallback(() => {
    if (effectiveReadOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (mode === "edit" && editBaselineForDirty) {
      return isEditDirtyVsLoaded(form, editBaselineForDirty);
    }
    if (mode === "edit") return form.isFieldsTouched(true);
    return false;
  }, [effectiveReadOnly, mode, form, isCreateDirty, editBaselineForDirty]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly: effectiveReadOnly,
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
    if (effectiveReadOnly || ownerRole) return;
    form
      .validateFields()
      .then((values) => {
        const payload = applyPayload(values);
        if (mode === "edit" && roleId != null) {
          updateMutation.mutate({ id: roleId, values: payload });
        }
      })
      .catch(() => {});
  }, [effectiveReadOnly, ownerRole, form, applyPayload, mode, roleId, updateMutation]);

  const footerMode = ownerRole && mode !== "create" ? "view" : mode;

  const title =
    mode === "create"
      ? t("drawerTitleCreate")
      : footerMode === "view"
        ? t("drawerTitleView")
        : t("drawerTitleEdit");

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
      footer={
        <ResourceDrawerFooter
          mode={footerMode}
          readOnly={effectiveReadOnly}
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
      <RoleDrawerForm
        form={form}
        readOnly={effectiveReadOnly}
        mode={footerMode}
        systemRole={systemRole}
        ownerRole={ownerRole}
        t={t}
      />
    </ResourceCrudDrawer>
  );
}
