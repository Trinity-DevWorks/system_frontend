"use client";

import dayjs from "dayjs";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchTreasuryTransfer } from "../../api/treasuryTransfers.api";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import TreasuryTransferDrawerForm from "./TreasuryTransferDrawerForm";
import { useTreasuryTransferDrawerMutations } from "../../queries/useTreasuryTransferMutations";
import {
  TREASURY_TRANSFER_CREATE_SAVE_INTENT_EVENT,
  TREASURY_TRANSFER_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  recordToFormValues,
  requiredFieldsValid,
  toTreasuryTransferCacheRow,
} from "../../utils/treasuryTransferDrawerUtils";
import { TREASURY_TRANSFERS_LIST_QUERY_KEY } from "../../queries/treasuryTransfersQueryKeys";

const TREASURY_TRANSFER_DETAIL_QUERY_PREFIX = /** @type {const} */ (TREASURY_TRANSFERS_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   treasuryTransferId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function TreasuryTransferDrawer({
  open,
  mode,
  treasuryTransferId,
  tableSeedRecord = null,
  onClose,
  onCreated,
  onCreateSuccess,
}) {
  const t = useTranslations("TreasuryTransfers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    TREASURY_TRANSFER_CREATE_SAVE_INTENT_KEY,
    TREASURY_TRANSFER_CREATE_SAVE_INTENT_EVENT,
  );

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({ transfer_date: dayjs(), from_account_id: undefined, to_account_id: undefined, amount_from: null, amount_to: null, exchange_rate: null, exchange_rate_to: null, reference: "", notes: "" }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toTreasuryTransferCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => recordToFormValues(r), []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: treasuryTransferId,
    // Table rows lack lines; always load the full record before editing.
    tableSeedRecord: null,
    form,
    defaults,
    queryKeyPrefix: TREASURY_TRANSFER_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchTreasuryTransfer,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const fromWatch = Form.useWatch("from_account_id", form);
  const toWatch = Form.useWatch("to_account_id", form);
  const amountWatch = Form.useWatch("amount_from", form);
  const canSubmitRequired = useMemo(
    () => requiredFieldsValid(fromWatch, toWatch, amountWatch),
    [fromWatch, toWatch, amountWatch],
  );

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

  const { createMutation, updateMutation, applyPayload, submitting } = useTreasuryTransferDrawerMutations({
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
      return toTreasuryTransferCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && treasuryTransferId != null) {
          updateMutation.mutate({ id: treasuryTransferId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, treasuryTransferId, updateMutation]);

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
      <TreasuryTransferDrawerForm form={form} readOnly={readOnly} t={t} />
    </ResourceCrudDrawer>
  );
}
