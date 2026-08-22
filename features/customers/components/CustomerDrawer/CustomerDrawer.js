"use client";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceAttachmentsPanel from "@/shared/components/resource-drawer/ResourceAttachmentsPanel";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchCurrencyNames } from "@/features/currencies/index";
import { fetchCustomerGroupNames } from "@/features/customer-groups/index";
import { fetchCustomer } from "../../api/customers.api";
import { customersAttachmentsApi } from "../../api/customersAttachments.api";
import { fetchPaymentMethodNames } from "@/features/payment-methods/index";
import { fetchPaymentTermNames } from "@/features/payment-terms/index";
import { SALESMEN_LIST_QUERY_KEY, fetchSalesmanNames } from "@/features/salesmen";
import { fetchVatGroupNames } from "@/features/vat-groups/index";
import CustomerGroupDrawer from "@/features/customer-groups/components/CustomerGroupDrawer/CustomerGroupDrawer";
import PaymentMethodDrawer from "@/features/payment-methods/components/PaymentMethodDrawer/PaymentMethodDrawer";
import PaymentTermDrawer from "@/features/payment-terms/components/PaymentTermDrawer/PaymentTermDrawer";
import SalesmanDrawer from "@/features/salesmen/components/SalesmanDrawer/SalesmanDrawer";
import VatGroupDrawer from "@/features/vat-groups/components/VatGroupDrawer/VatGroupDrawer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import CustomerDrawerForm from "./CustomerDrawerForm";
import {
  CUSTOMER_CREATE_SAVE_INTENT_EVENT,
  CUSTOMER_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  mapApiCurrencyBalancesToFormSplit,
  requiredFieldsValid,
  toCustomerCacheRow,
} from "../../utils/customerDrawerUtils";
import { useCustomerDrawerMutations } from "../../queries/useCustomerMutations";
import { CUSTOMERS_LIST_QUERY_KEY } from "../../queries/customersQueryKeys";
import { CUSTOMER_GROUPS_LIST_QUERY_KEY } from "@/features/customer-groups";
import { PAYMENT_METHODS_LIST_QUERY_KEY } from "@/features/payment-methods";
import { PAYMENT_TERMS_LIST_QUERY_KEY } from "@/features/payment-terms";
import { VAT_GROUPS_LIST_QUERY_KEY } from "@/features/vat-groups";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";

const CUSTOMER_DETAIL_QUERY_PREFIX = /** @type {const} */ (CUSTOMERS_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   customerId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function CustomerDrawer({
  open,
  mode,
  customerId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Customers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [nestedCreate, setNestedCreate] = useState(
    /** @type {import("../../utils/customerDrawerUtils").CustomerNestedCreateKey | null} */ (null),
  );
  const lastCreateIntent = usePersistedSaveIntent(CUSTOMER_CREATE_SAVE_INTENT_KEY, CUSTOMER_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const closeNestedCreate = useCallback(() => setNestedCreate(null), []);

  const handleDrawerClose = useCallback(() => {
    setNestedCreate(null);
    onClose();
  }, [onClose]);

  const makeNestedCreatedHandler = useCallback(
    /**
     * @param {string} fieldName
     * @param {readonly string[]} queryKey
     */
    (fieldName, queryKey) =>
      /** @param {Record<string, unknown>} record */ (record) => {
        const id = record?.id;
        if (id == null || Number.isNaN(Number(id))) return;
        form.setFieldValue(fieldName, Number(id));
        queryClient.invalidateQueries({ queryKey });
      },
    [form, queryClient],
  );

  const onNestedCustomerGroupCreated = useMemo(
    () => makeNestedCreatedHandler("customer_group_id", CUSTOMER_GROUPS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedSalesmanCreated = useMemo(
    () => makeNestedCreatedHandler("salesman_id", SALESMEN_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedPaymentMethodCreated = useMemo(
    () => makeNestedCreatedHandler("payment_method_id", PAYMENT_METHODS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedPaymentTermsCreated = useMemo(
    () => makeNestedCreatedHandler("payment_terms_id", PAYMENT_TERMS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );
  const onNestedVatGroupCreated = useMemo(
    () => makeNestedCreatedHandler("vat_group_id", VAT_GROUPS_LIST_QUERY_KEY),
    [makeNestedCreatedHandler],
  );

  const customerAttachmentsQueryKey = useMemo(
    () => /** @type {const} */ ([...CUSTOMERS_LIST_QUERY_KEY, customerId, "attachments"]),
    [customerId],
  );

  const defaults = useMemo(
    () => ({
      name: "",
      email: "",
      phone: "",
      customer_group_id: undefined,
      salesman_id: undefined,
      payment_method_id: undefined,
      payment_terms_id: undefined,
      vat_group_id: undefined,
      type: "individual",
      currency_credit_limits: [],
      currency_opening_balances: [],
      status: "active",
      blacklist_reason: "",
      is_vat_registered: false,
      vat_number: "",
      notes: "",
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toCustomerCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => {
    return {
      customer_code: r.customer_code,
      name: r.name,
      email: r.email ?? "",
      phone: r.phone ?? "",
      customer_group_id: r.customer_group_id ?? undefined,
      salesman_id: r.salesman_id ?? undefined,
      payment_method_id: r.payment_method_id ?? undefined,
      payment_terms_id: r.payment_terms_id ?? undefined,
      vat_group_id: r.vat_group_id ?? undefined,
      type: r.type,
      ...mapApiCurrencyBalancesToFormSplit(r.currency_balances),
      status: ["active", "suspended", "blacklisted"].includes(String(r.status)) ? r.status : "active",
      blacklist_reason: r.blacklist_reason ?? "",
      is_vat_registered: r.is_vat_registered === true,
      vat_number: r.vat_number ?? "",
      notes: r.notes ?? "",
    };
  }, []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: customerId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: CUSTOMER_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchCustomer,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const customerGroupsQuery = useQuery({
    queryKey: CUSTOMER_GROUPS_LIST_QUERY_KEY,
    queryFn: () => fetchCustomerGroupNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: () => fetchCurrencyNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const salesmenQuery = useQuery({
    queryKey: SALESMEN_LIST_QUERY_KEY,
    queryFn: () => fetchSalesmanNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const paymentMethodsQuery = useQuery({
    queryKey: PAYMENT_METHODS_LIST_QUERY_KEY,
    queryFn: () => fetchPaymentMethodNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const paymentTermsQuery = useQuery({
    queryKey: PAYMENT_TERMS_LIST_QUERY_KEY,
    queryFn: () => fetchPaymentTermNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const vatGroupsQuery = useQuery({
    queryKey: VAT_GROUPS_LIST_QUERY_KEY,
    queryFn: () => fetchVatGroupNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const customerGroupOptions = useMemo(() => {
    const rows = customerGroupsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name ?? row.id}${row.code ? ` (${row.code})` : ""}`,
    }));
  }, [customerGroupsQuery.data]);

  const salesmenOptions = useMemo(() => {
    const rows = salesmenQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && row.is_active !== false)
      .map((row) => ({
        value: row.id,
        label: `${row.full_name ?? row.id}${row.salesman_code ? ` (${row.salesman_code})` : ""}`,
      }));
  }, [salesmenQuery.data]);

  const paymentMethodOptions = useMemo(() => {
    const rows = paymentMethodsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && row.is_active !== false)
      .map((row) => ({
        value: row.id,
        label: `${row.code ?? row.id} — ${row.name ?? ""}`,
      }));
  }, [paymentMethodsQuery.data]);

  const paymentTermOptions = useMemo(() => {
    const rows = paymentTermsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && row.is_active !== false)
      .map((row) => ({
        value: row.id,
        label: `${row.code ?? row.id} — ${row.name ?? ""}${row.due_days != null ? ` (${row.due_days}d)` : ""}`,
      }));
  }, [paymentTermsQuery.data]);

  const vatGroupOptions = useMemo(() => {
    const rows = vatGroupsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      value: row.id,
      label: `${row.abrv ?? row.id} — ${row.name ?? ""}${row.percentage != null ? ` (${row.percentage}%)` : ""}`,
    }));
  }, [vatGroupsQuery.data]);

  const nameWatch = Form.useWatch("name", form);
  const typeWatch = Form.useWatch("type", form);

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    const type = typeof typeWatch === "string" ? typeWatch : "";
    return requiredFieldsValid(name, type);
  }, [nameWatch, typeWatch]);

  const customerGroupsData = Array.isArray(customerGroupsQuery.data) ? customerGroupsQuery.data : undefined;
  const currenciesData = Array.isArray(currenciesQuery.data) ? currenciesQuery.data : undefined;

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

  const { createMutation, updateMutation, toCreatePayload, toUpdatePayload, submitting } = useCustomerDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose: handleDrawerClose,
    onCreated,
    onSyncCreateDiscardBaseline,
    defaults,
    customerGroupsData,
    currenciesData,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toCustomerCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
    onClose: handleDrawerClose,
    shouldConfirmDiscard,
  });

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => {
          const payload = toCreatePayload(values);
          createMutation.mutate({ payload, intent });
        })
        .catch(() => {});
    },
    [form, toCreatePayload, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly) return;
    form
      .validateFields()
      .then((values) => {
        const payload = toUpdatePayload(values);
        if (mode === "edit" && customerId != null) {
          updateMutation.mutate({ id: customerId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, toUpdatePayload, mode, customerId, updateMutation]);

  const title =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isPending;

  const createSaveDisabled =
    !canSubmitRequired ||
    submitting ||
    (fetchRemoteDetail && detailEnabled && detailQuery.isError);

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
      size={800}
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
      <CustomerDrawerForm
        form={form}
        mode={mode}
        readOnly={readOnly}
        t={t}
        customerGroupOptions={customerGroupOptions}
        customerGroupsPending={customerGroupsQuery.isPending}
        onOpenCustomerGroupDrawer={readOnly ? undefined : () => setNestedCreate("customer-group")}
        salesmenOptions={salesmenOptions}
        salesmenPending={salesmenQuery.isPending}
        onOpenSalesmanDrawer={readOnly ? undefined : () => setNestedCreate("salesman")}
        paymentMethodOptions={paymentMethodOptions}
        paymentMethodsPending={paymentMethodsQuery.isPending}
        onOpenPaymentMethodDrawer={readOnly ? undefined : () => setNestedCreate("payment-method")}
        paymentTermOptions={paymentTermOptions}
        paymentTermsPending={paymentTermsQuery.isPending}
        onOpenPaymentTermsDrawer={readOnly ? undefined : () => setNestedCreate("payment-terms")}
        vatGroupOptions={vatGroupOptions}
        vatGroupsPending={vatGroupsQuery.isPending}
        onOpenVatGroupDrawer={readOnly ? undefined : () => setNestedCreate("vat-group")}
        currencies={currenciesData ?? []}
        currenciesPending={currenciesQuery.isPending}
      />
      {!readOnly ? (
        <>
          <CustomerGroupDrawer
            open={open && nestedCreate === "customer-group"}
            mode="create"
            customerGroupId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={onNestedCustomerGroupCreated}
          />
          <SalesmanDrawer
            open={open && nestedCreate === "salesman"}
            mode="create"
            salesmanId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={onNestedSalesmanCreated}
          />
          <PaymentMethodDrawer
            open={open && nestedCreate === "payment-method"}
            mode="create"
            paymentMethodId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={onNestedPaymentMethodCreated}
          />
          <PaymentTermDrawer
            open={open && nestedCreate === "payment-terms"}
            mode="create"
            paymentTermId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={onNestedPaymentTermsCreated}
          />
          <VatGroupDrawer
            open={open && nestedCreate === "vat-group"}
            mode="create"
            vatGroupId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={onNestedVatGroupCreated}
          />
        </>
      ) : null}
      <ResourceAttachmentsPanel
        open={open}
        recordId={customerId}
        readOnly={readOnly}
        t={t}
        tApiErrors={tApiErrors}
        queryKey={customerAttachmentsQueryKey}
        api={customersAttachmentsApi}
      />
    </ResourceCrudDrawer>
  );
}
