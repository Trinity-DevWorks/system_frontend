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
import { fetchExpenseVoucher } from "../../api/expenseVouchers.api";
import { expenseVoucherDetailQueryKey } from "../../queries/expenseVouchersQueryKeys";
import { useExpenseVoucherDrawerMutations } from "../../queries/useExpenseVoucherMutations";
import {
  expenseVoucherStatusColor,
  getExpenseVoucherDefaults,
  getExpenseVoucherStatusLabel,
  isExpenseVoucherDirty,
  recordToFormValues,
  requiredFieldsValid,
} from "../../utils/expenseVoucherDrawerUtils";
import ExpenseVoucherDrawerFooter from "./ExpenseVoucherDrawerFooter";
import { confirmPostWithBudgetCheck } from "@/features/budgets/components/BudgetWarningList";
import ExpenseVoucherDrawerForm from "./ExpenseVoucherDrawerForm";

/**
 * Expense voucher: money paid out of a cash box / bank account for expenses. Draft → posted → reversed,
 * like the other documents.
 *
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   expenseVoucherId: string | number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function ExpenseVoucherDrawer({ open, mode, expenseVoucherId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("ExpenseVouchers");
  const tApiErrors = useTranslations("ApiErrors");
  const tBudgets = useTranslations("Budgets");
  const access = useResourceAccess("expense_vouchers");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();

  // A new voucher keeps its id after the first save, so Post and Delete work in the same drawer.
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const voucherId = expenseVoucherId ?? savedId;

  const [baseline, setBaseline] = useState(() => getExpenseVoucherDefaults());
  const [loadedStatus, setLoadedStatus] = useState(/** @type {string | null} */ (null));
  const [loadedNumber, setLoadedNumber] = useState(/** @type {string | null} */ (null));
  const loadedDetailVersionRef = useRef(0);

  const detailEnabled = open && voucherId != null;
  const detailQuery = useQuery({
    queryKey: expenseVoucherDetailQueryKey(/** @type {string | number} */ (voucherId)),
    queryFn: () => fetchExpenseVoucher(String(voucherId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const syncFromRecord = useCallback(
    (record) => {
      if (!record || typeof record !== "object") return;
      const values = recordToFormValues(record);
      setBaseline(values);
      setLoadedStatus(typeof record.status === "string" ? record.status : null);
      setLoadedNumber(typeof record.voucher_number === "string" ? record.voucher_number : null);
      form.setFieldsValue(values);
    },
    [form],
  );

  // A new voucher starts clean each time the drawer opens.
  useLayoutEffect(() => {
    if (!open || mode !== "create" || expenseVoucherId != null) return;
    const defaults = getExpenseVoucherDefaults();
    /* eslint-disable react-hooks/set-state-in-effect -- reset the create draft when the drawer opens */
    setSavedId(null);
    setBaseline(defaults);
    setLoadedStatus("draft");
    setLoadedNumber(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    loadedDetailVersionRef.current = 0;
    form.resetFields();
    form.setFieldsValue(defaults);
  }, [open, mode, expenseVoucherId, form]);

  useEffect(() => {
    if (!open || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedDetailVersionRef.current === version) return;
    loadedDetailVersionRef.current = version;
    syncFromRecord(/** @type {Record<string, unknown>} */ (detailQuery.data));
  }, [open, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, syncFromRecord]);

  const effectiveStatus = loadedStatus ?? (typeof tableSeedRecord?.status === "string" ? tableSeedRecord.status : "draft");
  const readOnly = mode === "view" || effectiveStatus !== "draft" || (voucherId == null ? !access.canAdd : !access.canEdit);

  const cashWatch = Form.useWatch("cash_bank_account_id", form);
  const linesWatch = Form.useWatch("lines", { form, preserve: true });
  const canSave = requiredFieldsValid(cashWatch, linesWatch);

  const shouldConfirmDiscard = useCallback(() => !readOnly && isExpenseVoucherDirty(form, baseline), [readOnly, form, baseline]);
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

  const { saveMutation, postMutation, reverseMutation, deleteMutation, submitting } = useExpenseVoucherDrawerMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    voucherId,
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
      // Over budget is a warning in the confirm, never a block.
      .then((values) =>
        confirmPostWithBudgetCheck({
          source: "expense_voucher",
          id: voucherId,
          modal,
          notification,
          tBudgets,
          confirm: { title: t("postConfirmTitle"), content: t("postConfirmContent"), okText: t("actionPost"), cancelText: t("drawerCancel") },
          post: () => postMutation.mutateAsync({ values }).catch(() => undefined),
        }),
      )
      .catch(() => {});
  }, [form, modal, notification, t, tBudgets, postMutation, voucherId]);

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

  const title = mode === "create" && voucherId == null ? t("drawerTitleCreate") : readOnly ? t("drawerTitleView") : t("drawerTitleEdit");
  const doc = detailQuery.data && typeof detailQuery.data === "object" ? /** @type {Record<string, unknown>} */ (detailQuery.data) : null;

  return (
    <ResourceCrudDrawer
      documentBranch={doc}
      title={title}
      recordName={loadedNumber}
      titleExtra={
        effectiveStatus ? (
          <Tag className="m-0" color={expenseVoucherStatusColor(effectiveStatus)}>
            {getExpenseVoucherStatusLabel(t, effectiveStatus)}
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
      size={1150}
      footer={
        <ExpenseVoucherDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          saveDisabled={!canSave}
          postDisabled={!canSave}
          showDelete={!readOnly && voucherId != null && access.canDelete}
          showPost={!readOnly && access.canEdit}
          showReverse={effectiveStatus === "posted" && voucherId != null && access.canReverse}
          onSave={handleSave}
          onPost={handlePost}
          onDelete={handleDelete}
          onReverse={handleReverse}
        />
      }
    >
      <ExpenseVoucherDrawerForm form={form} readOnly={readOnly || submitting} t={t} />
    </ResourceCrudDrawer>
  );
}
