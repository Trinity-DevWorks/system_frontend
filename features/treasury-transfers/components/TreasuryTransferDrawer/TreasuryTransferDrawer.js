"use client";

import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useQuery } from "@tanstack/react-query";
import { App, Form, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchTreasuryTransfer } from "../../api/treasuryTransfers.api";
import { treasuryTransferDetailQueryKey } from "../../queries/treasuryTransfersQueryKeys";
import { useTreasuryTransferDrawerMutations } from "../../queries/useTreasuryTransferMutations";
import {
  treasuryTransferStatusColor,
  getTreasuryTransferDefaults,
  getTreasuryTransferStatusLabel,
  isTreasuryTransferDirty,
  recordToFormValues,
  requiredFieldsValid,
} from "../../utils/treasuryTransferDrawerUtils";
import TreasuryTransferDrawerFooter from "./TreasuryTransferDrawerFooter";
import TreasuryTransferDrawerForm from "./TreasuryTransferDrawerForm";

/**
 * Cash/bank transfer: money moved from one cash box / bank account to another. Draft → posted → reversed,
 * like the other documents.
 *
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   treasuryTransferId: string | number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function TreasuryTransferDrawer({ open, mode, treasuryTransferId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("TreasuryTransfers");
  const tApiErrors = useTranslations("ApiErrors");
  const access = useResourceAccess("treasury_transfers");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  // A new transfer keeps its id after the first save, so Post and Delete work in the same drawer.
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const transferId = treasuryTransferId ?? savedId;

  const [baseline, setBaseline] = useState(() => getTreasuryTransferDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && transferId != null;
  const detailQuery = useQuery({
    queryKey: treasuryTransferDetailQueryKey(/** @type {string | number} */ (transferId)),
    queryFn: () => fetchTreasuryTransfer(String(transferId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const values = recordToFormValues(record);
      setBaseline(values);
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.transfer_number === "string" ? record.transfer_number : null);
      form.setFieldsValue(values);
    },
    [form],
  );

  // A new transfer starts clean each time the drawer opens.
  useLayoutEffect(() => {
    if (!open || mode !== "create" || treasuryTransferId != null) return;
    const defaults = getTreasuryTransferDefaults();
    /* eslint-disable react-hooks/set-state-in-effect -- reset the create draft when the drawer opens */
    setSavedId(null);
    setBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    loadedDetailVersionRef.current = 0;
    form.resetFields();
    form.setFieldsValue(defaults);
  }, [open, mode, treasuryTransferId, form]);

  useEffect(() => {
    if (!open || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || effectiveStatus !== "draft" || (transferId == null ? !access.canAdd : !access.canEdit);

  const fromWatch = Form.useWatch("from_account_id", form);
  const toWatch = Form.useWatch("to_account_id", form);
  const amountWatch = Form.useWatch("amount_from", form);
  const canSave = requiredFieldsValid(fromWatch, toWatch, amountWatch);

  const shouldConfirmDiscard = useCallback(() => !readOnly && isTreasuryTransferDirty(form, baseline), [readOnly, form, baseline]);
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose, shouldConfirmDiscard });

  const afterSave = useCallback(
    (record) => {
      syncFromRecord(record);
      loadedDetailVersionRef.current = Date.now();
    },
    [syncFromRecord],
  );

  const handleCreated = useCallback(
    (record) => {
      if (record?.id != null) setSavedId(String(record.id));
      onCreated?.(record);
    },
    [onCreated],
  );

  const { saveMutation, postMutation, reverseMutation, deleteMutation, submitting } = useTreasuryTransferDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    transferId,
    onCreated: handleCreated,
    onSaved: afterSave,
    onPosted: afterSave,
    onReversed: afterSave,
    onDeleted: forceClose,
  });

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate({ values }))
      .catch(() => {});
  }, [form, saveMutation]);

  const handlePost = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        modal.confirm({
          title: t("postConfirmTitle"),
          content: t("postConfirmContent"),
          okText: t("actionPost"),
          cancelText: t("drawerCancel"),
          onOk: () => closeConfirmOnError(postMutation.mutateAsync({ values })),
        });
      })
      .catch(() => {});
  }, [form, modal, t, postMutation]);

  const handleReverse = useCallback(() => {
    modal.confirm({
      title: t("reverseConfirmTitle"),
      content: t("reverseConfirmContent"),
      okText: t("actionReverse"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
    });
  }, [modal, t, reverseMutation]);

  const handleDelete = useCallback(() => {
    modal.confirm({
      title: t("deleteConfirmTitle"),
      content: t("deleteConfirmContent", { name: loadedNumber ?? "" }),
      okText: t("deleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("deleteConfirmCancel"),
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
    });
  }, [modal, t, deleteMutation, loadedNumber]);

  const title = mode === "create" && transferId == null ? t("drawerTitleCreate") : readOnly ? t("drawerTitleView") : t("drawerTitleEdit");
  const doc = detailQuery.data && typeof detailQuery.data === "object" ? /** @type {Record<string, unknown>} */ (detailQuery.data) : null;

  return (
    <ResourceCrudDrawer
      documentBranch={doc}
      title={title}
      recordName={loadedNumber}
      titleExtra={
        effectiveStatus ? (
          <Tag className="m-0" color={treasuryTransferStatusColor(effectiveStatus)}>
            {getTreasuryTransferStatusLabel(t, effectiveStatus)}
          </Tag>
        ) : null
      }
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand
      showDetailLoading={detailEnabled && detailQuery.isLoading}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      size={720}
      footer={
        <TreasuryTransferDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSave}
          postDisabled={!canSave}
          showDelete={!readOnly && transferId != null && access.canDelete}
          showPost={!readOnly && access.canEdit}
          showReverse={effectiveStatus === "posted" && transferId != null && access.canReverse}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
          onReverse={handleReverse}
        />
      }
    >
      <TreasuryTransferDrawerForm form={form} readOnly={readOnly || submitting} t={t} />
    </ResourceCrudDrawer>
  );
}
