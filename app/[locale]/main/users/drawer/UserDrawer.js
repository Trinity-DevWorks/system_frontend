"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchTenantUser } from "@/services/tenantUsersApi";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  USER_CREATE_SAVE_INTENT_EVENT,
  USER_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toUserCacheRow,
} from "./userDrawerUtils";
import UserDrawerForm from "./UserDrawerForm";
import { useUserDrawerMutations } from "./useUserDrawerMutations";

const USER_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "users"]);

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
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(USER_CREATE_SAVE_INTENT_KEY, USER_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      name: "",
      email: "",
      role_id: null,
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
      role_id: r.role_id ?? r.role?.id ?? null,
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
  const roleIdWatch = Form.useWatch("role_id", form);
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
      roleIdWatch,
      mode === "create" ? "create" : "edit",
      password,
      passwordConfirmation,
    );
  }, [nameWatch, emailWatch, roleIdWatch, passwordWatch, passwordConfirmationWatch, mode]);

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

  const { createMutation, updateMutation, applyPayload, submitting } = useUserDrawerMutations({
    form,
    mode,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    onSyncCreateDiscardBaseline,
    defaults,
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
      skeletonParagraphRows={7}
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
      <UserDrawerForm form={form} readOnly={readOnly} mode={mode} open={open} t={t} />
    </ResourceCrudDrawer>
  );
}
