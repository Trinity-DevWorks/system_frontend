"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchCurrency } from "@/services/currenciesApi";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import CurrencyDrawerForm from "./CurrencyDrawerForm";
import { useCurrencyDrawerMutations } from "./useCurrencyDrawerMutations";
import {
  CURRENCY_CREATE_SAVE_INTENT_EVENT,
  CURRENCY_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toCurrencyCacheRow,
} from "./currencyDrawerUtils";

const CURRENCY_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "currencies"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   currencyId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function CurrencyDrawer({ open, mode, currencyId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("Currencies");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(CURRENCY_CREATE_SAVE_INTENT_KEY, CURRENCY_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      name: "",
      code: "",
      iso_code: "",
      symbol: undefined,
      is_active: true,
      is_primary: false,
      smallest_unit: undefined,
      round_limit: undefined,
      acceptable_amount_overdue: undefined,
      allowed_difference_in_receipt: undefined,
      allowed_difference_in_payment: undefined,
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toCurrencyCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      name: r.name,
      code: r.code,
      iso_code: r.iso_code,
      symbol: r.symbol ?? undefined,
      is_active: r.is_active !== false,
      is_primary: Boolean(r.is_primary),
      smallest_unit: r.smallest_unit != null && r.smallest_unit !== "" ? Number(r.smallest_unit) : undefined,
      round_limit: r.round_limit != null && r.round_limit !== "" ? Number(r.round_limit) : undefined,
      acceptable_amount_overdue:
        r.acceptable_amount_overdue != null && r.acceptable_amount_overdue !== ""
          ? Number(r.acceptable_amount_overdue)
          : undefined,
      allowed_difference_in_receipt:
        r.allowed_difference_in_receipt != null && r.allowed_difference_in_receipt !== ""
          ? Number(r.allowed_difference_in_receipt)
          : undefined,
      allowed_difference_in_payment:
        r.allowed_difference_in_payment != null && r.allowed_difference_in_payment !== ""
          ? Number(r.allowed_difference_in_payment)
          : undefined,
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: currencyId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: CURRENCY_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchCurrency,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const nameWatch = Form.useWatch("name", form);
  const codeWatch = Form.useWatch("code", form);
  const isoWatch = Form.useWatch("iso_code", form);

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const code = typeof codeWatch === "string" ? codeWatch : "";
    const iso = typeof isoWatch === "string" ? isoWatch : "";
    return requiredFieldsValid(name, code, iso);
  }, [nameWatch, codeWatch, isoWatch]);

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

  const { createMutation, updateMutation, applyPayload, submitting } = useCurrencyDrawerMutations({
    form,
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
    if (tableSeedMatches && tableSeedRecord) {
      return toCurrencyCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
          const payload = applyPayload(values, "create", null);
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
        const payload = applyPayload(values, "edit", currencyId);
        if (mode === "edit" && currencyId != null) {
          updateMutation.mutate({ id: currencyId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, currencyId, updateMutation]);

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
      skeletonParagraphRows={6}
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
      <CurrencyDrawerForm form={form} readOnly={readOnly} t={t} />
    </ResourceCrudDrawer>
  );
}
