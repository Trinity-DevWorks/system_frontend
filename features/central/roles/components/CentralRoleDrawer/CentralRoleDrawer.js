"use client";

import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { fetchCentralRole } from "../../api/roles.api";
import { useCentralRoleDrawerMutations } from "../../queries/useRoleMutations";
import { CENTRAL_ROLES_LIST_QUERY_KEY } from "../../queries/rolesQueryKeys";
import {
  CENTRAL_ROLE_CREATE_SAVE_INTENT_EVENT,
  CENTRAL_ROLE_CREATE_SAVE_INTENT_KEY,
  CENTRAL_ROLE_DEFAULTS,
  isRoleFormDirty,
  isSystemCentralRole,
  requiredFieldsValid,
  roleFormValuesToPayload,
  toCentralRoleCacheRow,
} from "../../utils/roleDrawerUtils";
import CentralRoleDrawerForm from "./CentralRoleDrawerForm";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   roleId: number | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   editSeedRecord?: Record<string, unknown> | null;
 * }} props
 */
export default function CentralRoleDrawer({ open, mode, roleId, onClose, onCreated, editSeedRecord = null }) {
  const t = useTranslations("CentralRoles");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    CENTRAL_ROLE_CREATE_SAVE_INTENT_KEY,
    CENTRAL_ROLE_CREATE_SAVE_INTENT_EVENT,
  );

  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      description: r.description ?? "",
      is_active: Boolean(r.is_active),
    }),
    [],
  );
  const mapSeedToCacheRow = useCallback((seed) => toCentralRoleCacheRow(seed), []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: roleId,
    tableSeedRecord: editSeedRecord,
    form,
    defaults: CENTRAL_ROLE_DEFAULTS,
    queryKeyPrefix: CENTRAL_ROLES_LIST_QUERY_KEY,
    fetchDetail: fetchCentralRole,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const loaded = detailQuery.data ?? (tableSeedMatches ? editSeedRecord : null);
  const systemRole = mode !== "create" && isSystemCentralRole(loaded);
  // Super Admin is immutable even if opened in edit mode (deep-link safety).
  const effectiveReadOnly = mode === "view" || systemRole;
  const footerMode = systemRole && mode !== "create" ? "view" : mode;

  const nameWatch = Form.useWatch("name", form);
  const canSubmitRequired = requiredFieldsValid(typeof nameWatch === "string" ? nameWatch : "");

  const { syncBaselineFromFormFields, resetBaselineToDefaults, isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults: CENTRAL_ROLE_DEFAULTS,
    isCreateDirtyVsBaseline: isRoleFormDirty,
  });

  const onSyncCreateDiscardBaseline = useCallback(
    /** @param {"fromForm" | "defaults"} kind */
    (kind) => {
      if (kind === "fromForm") syncBaselineFromFormFields();
      else resetBaselineToDefaults();
    },
    [syncBaselineFromFormFields, resetBaselineToDefaults],
  );

  const { createMutation, updateMutation, submitting } = useCentralRoleDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    onSyncCreateDiscardBaseline,
  });

  const shouldConfirmDiscard = useCallback(() => {
    if (effectiveReadOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (mode === "edit" && loaded) {
      return isRoleFormDirty(form, /** @type {any} */ (toCentralRoleCacheRow(/** @type {Record<string, unknown>} */ (loaded))));
    }
    return false;
  }, [effectiveReadOnly, mode, isCreateDirty, loaded, form]);

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
        .then((values) => createMutation.mutate({ payload: roleFormValuesToPayload(values), intent }))
        .catch(() => {});
    },
    [form, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (effectiveReadOnly || roleId == null) return;
    form
      .validateFields()
      .then((values) => updateMutation.mutate({ id: roleId, values: roleFormValuesToPayload(values) }))
      .catch(() => {});
  }, [effectiveReadOnly, roleId, form, updateMutation]);

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
    return all.filter((key) => key !== lastCreateIntent).map((key) => ({ key, label: createIntentLabel(key) }));
  }, [lastCreateIntent, createIntentLabel]);

  const title =
    mode === "create"
      ? t("drawerTitleCreate")
      : footerMode === "view"
        ? t("drawerTitleView")
        : t("drawerTitleEdit");

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={fetchRemoteDetail && detailQuery.isPending}
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
          createSaveDisabled={!canSubmitRequired || submitting}
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
      <CentralRoleDrawerForm form={form} readOnly={effectiveReadOnly} systemRole={systemRole} t={t} />
    </ResourceCrudDrawer>
  );
}
