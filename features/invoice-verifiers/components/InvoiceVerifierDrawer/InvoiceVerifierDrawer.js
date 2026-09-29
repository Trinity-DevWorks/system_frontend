"use client";

import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { WALLET_ADDRESS_PATTERN } from "@/lib/wallet-address";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { fetchInvoiceVerifier } from "../../api/invoiceVerifiers.api";
import { INVOICE_VERIFIERS_LIST_QUERY_KEY } from "../../queries/invoiceVerifiersQueryKeys";
import { useInvoiceVerifierDrawerMutations } from "../../queries/useInvoiceVerifierMutations";
import { useInvoiceVerifiersQuery } from "../../queries/useInvoiceVerifiersQuery";
import {
  INVOICE_VERIFIER_CREATE_SAVE_INTENT_EVENT,
  INVOICE_VERIFIER_CREATE_SAVE_INTENT_KEY,
  INVOICE_VERIFIER_DEFAULTS,
  invoiceVerifierFormValuesToPayload,
  invoiceVerifierToFormValues,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
} from "../../utils/invoiceVerifierDrawerUtils";
import InvoiceVerifierChainPanel from "./InvoiceVerifierChainPanel";
import InvoiceVerifierDrawerForm from "./InvoiceVerifierDrawerForm";

/** @param {Record<string, unknown>} seed */
const identity = (seed) => seed;

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   verifierId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function InvoiceVerifierDrawer({ open, mode, verifierId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("InvoiceVerifiers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    INVOICE_VERIFIER_CREATE_SAVE_INTENT_KEY,
    INVOICE_VERIFIER_CREATE_SAVE_INTENT_EVENT,
  );

  const readOnly = mode === "view";
  const isCreate = mode === "create";
  const defaults = INVOICE_VERIFIER_DEFAULTS;

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: verifierId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: INVOICE_VERIFIERS_LIST_QUERY_KEY,
    fetchDetail: fetchInvoiceVerifier,
    mapSeedToCacheRow: identity,
    mapRecordToFormValues: invoiceVerifierToFormValues,
  });

  // The list polls while a row is syncing, so it carries the freshest blockchain state.
  const listQuery = useInvoiceVerifiersQuery({ enabled: open && !isCreate });
  const loaded = /** @type {import("../../api/invoiceVerifiers.api").InvoiceVerifier | null} */ (
    isCreate
      ? null
      : (listQuery.rows.find((row) => String(row.id) === String(verifierId)) ??
          (detailQuery.data && typeof detailQuery.data === "object" ? detailQuery.data : null))
  );

  const nameWatch = Form.useWatch("name", form);
  const roleWatch = Form.useWatch("role", form);
  const walletWatch = Form.useWatch("wallet_address", form);

  const canSubmitRequired = useMemo(() => {
    if (typeof nameWatch !== "string" || nameWatch.trim() === "" || !roleWatch) return false;
    if (!isCreate) return true;
    return typeof walletWatch === "string" && WALLET_ADDRESS_PATTERN.test(walletWatch.trim());
  }, [nameWatch, roleWatch, walletWatch, isCreate]);

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

  const { createMutation, updateMutation, submitting } = useInvoiceVerifierDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    onSyncCreateDiscardBaseline,
    defaults,
  });

  const editBaseline = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data && typeof detailQuery.data === "object") {
      return /** @type {Record<string, unknown>} */ (detailQuery.data);
    }
    return tableSeedMatches && tableSeedRecord ? tableSeedRecord : null;
  }, [mode, detailQuery.data, tableSeedMatches, tableSeedRecord]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (isCreate) return isCreateDirty();
    if (editBaseline) return isEditDirtyVsLoaded(form, editBaseline);
    return form.isFieldsTouched(true);
  }, [readOnly, isCreate, isCreateDirty, editBaseline, form]);

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
        .then((values) => createMutation.mutate({ payload: invoiceVerifierFormValuesToPayload(values, true), intent }))
        .catch(() => {});
    },
    [form, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly || mode !== "edit" || verifierId == null) return;
    form
      .validateFields()
      .then((values) =>
        updateMutation.mutate({ id: verifierId, payload: invoiceVerifierFormValuesToPayload(values, false) }),
      )
      .catch(() => {});
  }, [readOnly, mode, verifierId, form, updateMutation]);

  const createIntentLabel = useCallback(
    (/** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} */ intent) => {
      if (intent === "keep") return t("drawerSave");
      if (intent === "new") return t("drawerSaveAndNew");
      return t("drawerSaveAndClose");
    },
    [t],
  );

  const createSaveMenuItems = useMemo(
    () =>
      /** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent[]} */ (["keep", "new", "close"])
        .filter((key) => key !== lastCreateIntent)
        .map((key) => ({ key, label: createIntentLabel(key) })),
    [lastCreateIntent, createIntentLabel],
  );

  const title = isCreate ? t("drawerTitleCreate") : readOnly ? t("drawerTitleView") : t("drawerTitleEdit");
  const detailLoadFailed = Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError);

  return (
    <ResourceCrudDrawer
      title={title}
      recordName={loaded?.name ?? null}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={fetchRemoteDetail && detailQuery.isPending}
      detailLoadFailed={detailLoadFailed}
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
      <InvoiceVerifierDrawerForm form={form} readOnly={readOnly} isCreate={isCreate} t={t} />
      {loaded ? <InvoiceVerifierChainPanel verifier={loaded} t={t} /> : null}
    </ResourceCrudDrawer>
  );
}
