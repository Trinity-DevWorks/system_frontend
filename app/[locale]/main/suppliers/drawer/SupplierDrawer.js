"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerHeaderFields } from "@/components/resource-drawer/useResourceDrawerHeaderFields";
import ResourceAttachmentsPanel from "@/components/resource-drawer/ResourceAttachmentsPanel";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useCreateDiscardBaseline } from "@/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchCurrencyNames } from "@/services/currenciesApi";
import { fetchPaymentMethodNames } from "@/services/paymentMethodsApi";
import { fetchPaymentTermNames } from "@/services/paymentTermsApi";
import { fetchSupplierGroupNames } from "@/services/supplierGroupsApi";
import { fetchVatGroupNames } from "@/services/vatGroupsApi";
import { fetchSupplier } from "@/services/suppliersApi";
import PaymentMethodDrawer from "@/app/[locale]/main/payment-methods/drawer/PaymentMethodDrawer";
import PaymentTermDrawer from "@/app/[locale]/main/payment-terms/drawer/PaymentTermDrawer";
import SupplierGroupDrawer from "@/app/[locale]/main/supplier-groups/drawer/SupplierGroupDrawer";
import VatGroupDrawer from "@/app/[locale]/main/vat-groups/drawer/VatGroupDrawer";
import { suppliersAttachmentsApi } from "@/services/suppliersAttachmentsApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import SupplierDrawerForm from "./SupplierDrawerForm";
import {
  SUPPLIER_CREATE_SAVE_INTENT_EVENT,
  SUPPLIER_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  mapApiCurrencyBalancesToFormSplit,
  requiredFieldsValid,
  toSupplierCacheRow,
} from "./supplierDrawerUtils";
import { useSupplierDrawerMutations } from "./useSupplierDrawerMutations";

const SUPPLIER_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "suppliers"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   supplierId: string | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SupplierDrawer({
  open,
  mode,
  supplierId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Suppliers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [nestedCreate, setNestedCreate] = useState(
    /** @type {import("./supplierDrawerUtils").SupplierNestedCreateKey | null} */ (null),
  );
  const lastCreateIntent = usePersistedSaveIntent(SUPPLIER_CREATE_SAVE_INTENT_KEY, SUPPLIER_CREATE_SAVE_INTENT_EVENT);

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

  const onNestedSupplierGroupCreated = useMemo(
    () => makeNestedCreatedHandler("supplier_group_id", ["tenant", "supplier-groups"]),
    [makeNestedCreatedHandler],
  );
  const onNestedPaymentMethodCreated = useMemo(
    () => makeNestedCreatedHandler("payment_method_id", ["tenant", "payment-methods"]),
    [makeNestedCreatedHandler],
  );
  const onNestedPaymentTermsCreated = useMemo(
    () => makeNestedCreatedHandler("payment_terms_id", ["tenant", "payment-terms"]),
    [makeNestedCreatedHandler],
  );
  const onNestedVatGroupCreated = useMemo(
    () => makeNestedCreatedHandler("vat_group_id", ["tenant", "vat-groups"]),
    [makeNestedCreatedHandler],
  );

  const supplierAttachmentsQueryKey = useMemo(
    () => /** @type {const} */ (["tenant", "suppliers", supplierId, "attachments"]),
    [supplierId],
  );

  const defaults = useMemo(
    () => ({
      name: "",
      company_name: "",
      email: "",
      phone: "",
      supplier_group_id: undefined,
      payment_method_id: undefined,
      payment_terms_id: undefined,
      vat_group_id: undefined,
      currency_credit_limits: [],
      currency_opening_balances: [],
      is_active: true,
      is_vat_registered: false,
      is_exempted: false,
      exemption_reason: "",
      exempted_from: undefined,
      exempted_to: undefined,
      vat_number: "",
      notes: "",
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toSupplierCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => {
    return {
      supplier_code: r.supplier_code,
      name: r.name,
      company_name: r.company_name ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      supplier_group_id: r.supplier_group_id ?? undefined,
      payment_method_id: r.payment_method_id ?? undefined,
      payment_terms_id: r.payment_terms_id ?? undefined,
      vat_group_id: r.vat_group_id ?? undefined,
      ...mapApiCurrencyBalancesToFormSplit(r.currency_balances),
      is_active: r.is_active !== false,
      is_vat_registered: r.is_vat_registered === true,
      is_exempted: r.is_exempted === true,
      exemption_reason: r.exemption_reason ?? "",
      exempted_from: r.exempted_from ? dayjs(String(r.exempted_from)) : undefined,
      exempted_to: r.exempted_to ? dayjs(String(r.exempted_to)) : undefined,
      vat_number: r.vat_number ?? "",
      notes: r.notes ?? "",
    };
  }, []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: supplierId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: SUPPLIER_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchSupplier,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const supplierGroupsQuery = useQuery({
    queryKey: ["tenant", "supplier-groups"],
    queryFn: () => fetchSupplierGroupNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const currenciesQuery = useQuery({
    queryKey: ["tenant", "currencies"],
    queryFn: () => fetchCurrencyNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["tenant", "payment-methods"],
    queryFn: () => fetchPaymentMethodNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const paymentTermsQuery = useQuery({
    queryKey: ["tenant", "payment-terms"],
    queryFn: () => fetchPaymentTermNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const vatGroupsQuery = useQuery({
    queryKey: ["tenant", "vat-groups"],
    queryFn: () => fetchVatGroupNames(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const supplierGroupOptions = useMemo(() => {
    const rows = supplierGroupsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name ?? row.id}${row.code ? ` (${row.code})` : ""}`,
    }));
  }, [supplierGroupsQuery.data]);

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

  const canSubmitRequired = useMemo(() => {
    const name = typeof nameWatch === "string" ? nameWatch : "";
    return requiredFieldsValid(name);
  }, [nameWatch]);

  const supplierGroupsData = Array.isArray(supplierGroupsQuery.data) ? supplierGroupsQuery.data : undefined;
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

  const { createMutation, updateMutation, toCreatePayload, toUpdatePayload, submitting } = useSupplierDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose: handleDrawerClose,
    onCreated,
    onSyncCreateDiscardBaseline,
    defaults,
    supplierGroupsData,
    currenciesData,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toSupplierCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && supplierId != null) {
          updateMutation.mutate({ id: supplierId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, toUpdatePayload, mode, supplierId, updateMutation]);

  const drawerTitle =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const supplierDetailRow =
    detailQuery.data ?? (tableSeedMatches && tableSeedRecord ? tableSeedRecord : null);

  const { recordName, statusActive } = useResourceDrawerHeaderFields({
    mode,
    form,
    detailRow: supplierDetailRow && typeof supplierDetailRow === "object" ? supplierDetailRow : null,
    seedRow: tableSeedRecord,
    nameField: "name",
    activeField: "is_active",
  });

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
      title={drawerTitle}
      recordName={recordName}
      statusActive={statusActive}
      statusActiveLabel={t("statusActive")}
      statusInactiveLabel={t("statusInactive")}
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
      <SupplierDrawerForm
        form={form}
        mode={mode}
        readOnly={readOnly}
        t={t}
        supplierGroupOptions={supplierGroupOptions}
        supplierGroupsPending={supplierGroupsQuery.isPending}
        onOpenSupplierGroupDrawer={readOnly ? undefined : () => setNestedCreate("supplier-group")}
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
          <SupplierGroupDrawer
            open={open && nestedCreate === "supplier-group"}
            mode="create"
            supplierGroupId={null}
            onClose={closeNestedCreate}
            onCreateSuccess={onNestedSupplierGroupCreated}
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
        recordId={supplierId}
        readOnly={readOnly}
        t={t}
        tApiErrors={tApiErrors}
        queryKey={supplierAttachmentsQueryKey}
        api={suppliersAttachmentsApi}
      />
    </ResourceCrudDrawer>
  );
}
