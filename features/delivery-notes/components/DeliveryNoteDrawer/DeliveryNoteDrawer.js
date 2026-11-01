"use client";

import dayjs from "dayjs";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/shared/components/resource-drawer/useResourceDrawerDetailSync";
import {
  createDeliveryNote,
  fetchDeliveryNote,
  fetchDeliveryTemplate,
  postDeliveryNote,
  updateDeliveryNote,
} from "../../api/deliveryNotes.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Space } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import DeliveryNoteDrawerForm from "./DeliveryNoteDrawerForm";
import { useDeliveryNoteDrawerMutations } from "../../queries/useDeliveryNoteMutations";
import {
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  recordToFormValues,
  requiredFieldsValid,
  toDeliveryNoteCacheRow,
} from "../../utils/deliveryNoteDrawerUtils";
import { DELIVERY_NOTES_LIST_QUERY_KEY } from "../../queries/deliveryNotesQueryKeys";

const DELIVERY_NOTE_DETAIL_QUERY_PREFIX = /** @type {const} */ (DELIVERY_NOTES_LIST_QUERY_KEY);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   deliveryNoteId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   fromSalesOrderId?: string | null;
 * }} props
 */
export default function DeliveryNoteDrawer({
  open,
  mode,
  deliveryNoteId,
  tableSeedRecord = null,
  onClose,
  onCreated,
  onCreateSuccess,
  fromSalesOrderId = null,
}) {
  const t = useTranslations("DeliveryNotes");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const defaults = useMemo(
    () => ({
      customer_id: undefined,
      warehouse_id: undefined,
      delivery_date: dayjs(),
      sales_order_id: null,
      notes: "",
      lines: [{ item_id: null, item_uom_id: null, quantity: null, lot_id: null }],
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toDeliveryNoteCacheRow(seed), []);
  const mapRecordToFormValues = useCallback((r) => recordToFormValues(r), []);

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: deliveryNoteId,
    // Table rows lack lines; always load the full record before editing.
    tableSeedRecord: null,
    form,
    defaults,
    queryKeyPrefix: DELIVERY_NOTE_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchDeliveryNote,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  // Posted / reversed notes are read-only even when opened for edit.
  const loadedStatus = /** @type {string | undefined} */ (detailQuery.data?.status);
  const readOnly = mode === "view" || (mode === "edit" && loadedStatus != null && loadedStatus !== "draft");

  // "Create delivery note" from a sales order: fill the create drawer, nothing is saved yet.
  const seedQuery = useQuery({
    queryKey: ["tenant", "delivery-notes", "order-template", fromSalesOrderId],
    queryFn: () => fetchDeliveryTemplate(/** @type {string} */ (fromSalesOrderId)),
    enabled: open && mode === "create" && Boolean(fromSalesOrderId),
    staleTime: 0,
    gcTime: 0,
  });
  const appliedSeedRef = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      appliedSeedRef.current = null;
      return;
    }
    if (mode !== "create" || !seedQuery.data) return;
    const stamp = `${fromSalesOrderId}:${seedQuery.dataUpdatedAt}`;
    if (appliedSeedRef.current === stamp) return;
    appliedSeedRef.current = stamp;
    form.setFieldsValue(recordToFormValues(seedQuery.data));
  }, [open, mode, seedQuery.data, seedQuery.dataUpdatedAt, fromSalesOrderId, form]);
  useEffect(() => {
    if (seedQuery.isError) {
      notification.error({
        title: t("orderLoadError"),
        description: getLocalizedApiErrorMessage(tApiErrors, seedQuery.error),
      });
    }
  }, [seedQuery.isError, seedQuery.error, notification, t, tApiErrors]);

  const customerWatch = Form.useWatch("customer_id", form);
  const warehouseWatch = Form.useWatch("warehouse_id", form);
  const linesWatch = Form.useWatch("lines", form);
  const canSubmitRequired = useMemo(
    () => requiredFieldsValid(customerWatch, warehouseWatch, linesWatch),
    [customerWatch, warehouseWatch, linesWatch],
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

  const { createMutation, updateMutation, applyPayload, submitting } = useDeliveryNoteDrawerMutations({
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
      return toDeliveryNoteCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
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
        if (mode === "edit" && deliveryNoteId != null) {
          updateMutation.mutate({ id: deliveryNoteId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, deliveryNoteId, updateMutation]);

  // Post = save the current values, then post (same flow as goods receipts).
  const postMutation = useMutation({
    mutationFn: async (/** @type {Record<string, unknown>} */ payload) => {
      let id = deliveryNoteId != null ? String(deliveryNoteId) : null;
      if (id == null) {
        const created = /** @type {Record<string, any>} */ (await createDeliveryNote(payload));
        id = created?.id != null ? String(created.id) : null;
        if (id == null) throw new Error("Missing delivery note id after create");
      } else {
        await updateDeliveryNote(id, payload);
      }
      return postDeliveryNote(id);
    },
    onSuccess: () => {
      message.success(t("postSuccess"));
      invalidateTenantListQueries(queryClient, DELIVERY_NOTES_LIST_QUERY_KEY);
      queryClient.invalidateQueries({ queryKey: ["tenant", "sales-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["tenant", "delivery-notes", "deliverable-orders"],
      });
      form.resetFields();
      forceClose();
    },
    onError: (err) => {
      invalidateTenantListQueries(queryClient, DELIVERY_NOTES_LIST_QUERY_KEY);
      notification.error({
        title: t("actionError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handlePost = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("postConfirmTitle"),
          content: t("postConfirmContent"),
          okText: t("actionPost"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync(applyPayload(values))),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation, applyPayload]);

  const title = mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isPending;

  const busy = submitting || postMutation.isPending;
  const detailFailed = Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError);
  const actionsDisabled = !canSubmitRequired || busy || detailFailed;
  // Save on a new note keeps the drawer open on the saved draft (same as the sales order).
  const handleSave = mode === "create" ? () => runCreate("keep") : handleEditSubmit;

  return (
    <ResourceCrudDrawer
      className="sales-invoice-crud-drawer"
      title={title}
      placement="top"
      size="100%"
      showExpand={false}
      open={open}
      requestClose={requestClose}
      submitting={busy}
      showDetailLoading={showDetailLoading || seedQuery.isFetching}
      detailLoadFailed={detailFailed}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        <div className="flex w-full min-w-0 items-center gap-3">
          <Space className="ms-auto shrink-0">
            <Button onClick={readOnly ? forceClose : requestClose} disabled={busy}>
              {readOnly ? t("drawerClose") : t("drawerCancel")}
            </Button>
            {!readOnly ? (
              <>
                <Button loading={submitting} disabled={actionsDisabled} onClick={handleSave}>
                  {t("drawerSave")}
                </Button>
                <Button type="primary" loading={postMutation.isPending} disabled={actionsDisabled} onClick={handlePost}>
                  {t("actionPost")}
                </Button>
              </>
            ) : null}
          </Space>
        </div>
      }
    >
      <DeliveryNoteDrawerForm form={form} readOnly={readOnly} t={t} />
    </ResourceCrudDrawer>
  );
}
