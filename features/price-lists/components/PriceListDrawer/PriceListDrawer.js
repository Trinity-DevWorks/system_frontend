"use client";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchCurrencyNames } from "@/features/currencies/index";
import { useQuery } from "@tanstack/react-query";
import { fetchPriceList } from "../../api/priceLists.api";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import PriceListDrawerForm from "./PriceListDrawerForm";
import { usePriceListDrawerMutations } from "../../queries/usePriceListMutations";
import {
  PRICE_LIST_CREATE_SAVE_INTENT_EVENT,
  PRICE_LIST_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  recordToFormValues,
  requiredFieldsValid,
  toPriceListCacheRow,
} from "../../utils/priceListDrawerUtils";
import { PRICE_LISTS_LIST_QUERY_KEY } from "../../queries/priceListsQueryKeys";

const PRICE_LIST_DETAIL_QUERY_PREFIX = /** @type {const} */ (PRICE_LISTS_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   priceListId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function PriceListDrawer({
  open,
  mode,
  priceListId,
  tableSeedRecord = null,
  onClose,
  onCreated,
  onCreateSuccess,
}) {
  const t = useTranslations("PriceLists");
  const tSelector = useTranslations("SalesInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(
    PRICE_LIST_CREATE_SAVE_INTENT_KEY,
    PRICE_LIST_CREATE_SAVE_INTENT_EVENT,
  );

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      code: "",
      name: "",
      name_ar: "",
      currency_id: undefined,
      valid_from: null,
      valid_to: null,
      is_default: false,
      is_active: true,
      items: [],
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toPriceListCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => recordToFormValues(r), []);

  const currenciesQuery = useQuery({
    queryKey: ["tenant", "currencies"],
    queryFn: () => fetchCurrencyNames(),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const currencies = Array.isArray(currenciesQuery.data) ? currenciesQuery.data : [];

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: priceListId,
    // Table rows have no prices; always wait for the full record so a save never drops them.
    tableSeedRecord: null,
    form,
    defaults,
    queryKeyPrefix: PRICE_LIST_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchPriceList,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);
  const currencyWatch = Form.useWatch("currency_id", form);

  const canSubmitRequired = useMemo(() => {
    const code = typeof codeWatch === "string" ? codeWatch : "";
    const name = typeof nameWatch === "string" ? nameWatch : "";
    return requiredFieldsValid(code, name, currencyWatch);
  }, [codeWatch, nameWatch, currencyWatch]);

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

  const { createMutation, updateMutation, applyPayload, submitting } = usePriceListDrawerMutations({
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
      return toPriceListCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && priceListId != null) {
          updateMutation.mutate({ id: priceListId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, priceListId, updateMutation]);

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
      <PriceListDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        tSelector={tSelector}
        currencies={currencies}
        currenciesPending={currenciesQuery.isPending}
      />
    </ResourceCrudDrawer>
  );
}
