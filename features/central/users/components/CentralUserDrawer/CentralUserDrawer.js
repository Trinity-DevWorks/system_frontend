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
import { fetchCentralUser } from "../../api/users.api";
import { useCentralUserDrawerMutations } from "../../queries/useUserMutations";
import { CENTRAL_USERS_LIST_QUERY_KEY } from "../../queries/usersQueryKeys";
import {
  CENTRAL_USER_CREATE_SAVE_INTENT_EVENT,
  CENTRAL_USER_CREATE_SAVE_INTENT_KEY,
  CENTRAL_USER_DEFAULTS,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toCentralUserCacheRow,
  userFormValuesToPayload,
} from "../../utils/userDrawerUtils";
import CentralUserDrawerForm from "./CentralUserDrawerForm";

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
export default function CentralUserDrawer({ open, mode, userId, onClose, onCreated, editSeedRecord = null }) {
  const t = useTranslations("CentralUsers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    CENTRAL_USER_CREATE_SAVE_INTENT_KEY,
    CENTRAL_USER_CREATE_SAVE_INTENT_EVENT,
  );
  const readOnly = mode === "view";

  const mapSeedToCacheRow = useCallback((seed) => toCentralUserCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      email: r.email,
      central_role_id: r.central_role_id != null ? Number(r.central_role_id) : undefined,
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
    defaults: CENTRAL_USER_DEFAULTS,
    queryKeyPrefix: CENTRAL_USERS_LIST_QUERY_KEY,
    fetchDetail: fetchCentralUser,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const nameWatch = Form.useWatch("name", form);
  const emailWatch = Form.useWatch("email", form);
  const roleWatch = Form.useWatch("central_role_id", form);
  const passwordWatch = Form.useWatch("password", form);
  const passwordConfirmationWatch = Form.useWatch("password_confirmation", form);

  const canSubmitRequired = useMemo(
    () =>
      requiredFieldsValid({
        name: typeof nameWatch === "string" ? nameWatch : "",
        email: typeof emailWatch === "string" ? emailWatch : "",
        roleId: roleWatch,
        mode: mode === "create" ? "create" : "edit",
        password: typeof passwordWatch === "string" ? passwordWatch : "",
        passwordConfirmation: typeof passwordConfirmationWatch === "string" ? passwordConfirmationWatch : "",
      }),
    [nameWatch, emailWatch, roleWatch, passwordWatch, passwordConfirmationWatch, mode],
  );

  const { syncBaselineFromFormFields, resetBaselineToDefaults, isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode,
    form,
    defaults: CENTRAL_USER_DEFAULTS,
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

  const { createMutation, updateMutation, submitting } = useCentralUserDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    onSyncCreateDiscardBaseline,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return toCentralUserCacheRow(/** @type {Record<string, unknown>} */ (detailQuery.data));
    if (tableSeedMatches && editSeedRecord) {
      return toCentralUserCacheRow(/** @type {Record<string, unknown>} */ (editSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, editSeedRecord]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (mode === "edit" && editBaselineForDirty) return isEditDirtyVsLoaded(form, editBaselineForDirty);
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
        .then((values) => createMutation.mutate({ payload: userFormValuesToPayload(values, "create"), intent }))
        .catch(() => {});
    },
    [form, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly || userId == null) return;
    form
      .validateFields()
      .then((values) => updateMutation.mutate({ id: userId, values: userFormValuesToPayload(values, "edit") }))
      .catch(() => {});
  }, [readOnly, userId, form, updateMutation]);

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
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

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
          mode={mode}
          readOnly={readOnly}
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
      <CentralUserDrawerForm form={form} readOnly={readOnly} mode={mode} open={open} t={t} />
    </ResourceCrudDrawer>
  );
}
