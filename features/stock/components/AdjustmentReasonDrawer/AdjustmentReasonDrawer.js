"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { STOCK_ADJUSTMENT_REASON_DETAIL_QUERY_PREFIX } from "../../queries/stockQueryKeys";
import { useCreateDiscardBaseline } from "@/shared/components/resource-drawer/useCreateDiscardBaseline";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { fetchStockAdjustmentReason } from "../../api/stockAdjustmentReasons.api";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Form, Input, Select, Switch } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  STOCK_ADJUSTMENT_REASON_DIRECTIONS,
  getAdjustmentReasonDirectionLabel,
} from "../../utils/stockAdjustmentStatuses";
import { useStockAdjustmentReasonMutations } from "../../queries/useStockAdjustmentReasonMutations";

const DEFAULTS = {
  code: "",
  name: "",
  direction: "both",
  is_active: true,
  notes: "",
};

/**
 * @param {Record<string, unknown>} record
 */
function mapReasonToForm(record) {
  return {
    code: typeof record.code === "string" ? record.code : "",
    name: typeof record.name === "string" ? record.name : "",
    direction: typeof record.direction === "string" ? record.direction : "both",
    is_active: record.is_active !== false,
    notes: typeof record.notes === "string" ? record.notes : "",
  };
}

/**
 * @param {Record<string, unknown>} values
 */
function reasonToPayload(values) {
  return {
    code: typeof values.code === "string" ? values.code.trim() : "",
    name: typeof values.name === "string" ? values.name.trim() : "",
    direction: values.direction,
    is_active: values.is_active !== false,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}

/**
 * @param {import("antd").FormInstance} form
 * @param {typeof DEFAULTS} baseline
 */
function isReasonDirty(form, baseline) {
  const values = form.getFieldsValue(true);
  return (
    String(values.code ?? "").trim() !== String(baseline.code ?? "").trim() ||
    String(values.name ?? "").trim() !== String(baseline.name ?? "").trim() ||
    (values.direction ?? "both") !== (baseline.direction ?? "both") ||
    Boolean(values.is_active) !== Boolean(baseline.is_active) ||
    String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()
  );
}

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   reasonId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function AdjustmentReasonDrawer({
  open,
  mode,
  reasonId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const [form] = Form.useForm();
  const loadedVersionRef = useRef(0);

  const readOnly = mode === "view";
  const isSystem = Boolean(tableSeedRecord?.is_system);

  const detailEnabled = open && (mode === "edit" || mode === "view") && reasonId != null;

  const detailQuery = useQuery({
    queryKey: [...STOCK_ADJUSTMENT_REASON_DETAIL_QUERY_PREFIX, reasonId],
    queryFn: () => fetchStockAdjustmentReason(/** @type {number} */ (reasonId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const systemLocked = Boolean(
    (detailQuery.data && detailQuery.data.is_system) || (mode !== "create" && isSystem),
  );

  useLayoutEffect(() => {
    if (!open) return;
    if (mode === "create") {
      form.resetFields();
      form.setFieldsValue(DEFAULTS);
      loadedVersionRef.current = 0;
    }
  }, [open, mode, form]);

  useEffect(() => {
    if (!open || mode === "create" || !detailQuery.isSuccess || !detailQuery.data) return;
    const version = detailQuery.dataUpdatedAt;
    if (loadedVersionRef.current === version) return;
    loadedVersionRef.current = version;
    form.setFieldsValue(mapReasonToForm(/** @type {Record<string, unknown>} */ (detailQuery.data)));
  }, [open, mode, detailQuery.isSuccess, detailQuery.data, detailQuery.dataUpdatedAt, form]);

  const { isCreateDirty } = useCreateDiscardBaseline({
    open,
    mode: "create",
    form,
    defaults: DEFAULTS,
    isCreateDirtyVsBaseline: isReasonDirty,
  });

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (detailQuery.data) {
      return isReasonDirty(form, mapReasonToForm(/** @type {Record<string, unknown>} */ (detailQuery.data)));
    }
    return form.isFieldsTouched(true);
  }, [readOnly, mode, isCreateDirty, detailQuery.data, form]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard,
  });

  const { createMutation, updateMutation, submitting } = useStockAdjustmentReasonMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    onCreated: (record) => {
      onCreated?.(record);
    },
    onSaved: () => {
      forceClose();
    },
  });

  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);
  const directionWatch = Form.useWatch("direction", form);
  const canSubmit =
    String(codeWatch ?? "").trim() !== "" &&
    String(nameWatch ?? "").trim() !== "" &&
    String(directionWatch ?? "") !== "";

  const handleSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        const payload = reasonToPayload(values);
        if (mode === "create") {
          createMutation.mutate(payload);
        } else if (reasonId != null) {
          const body = { ...payload };
          if (systemLocked) delete body.code;
          updateMutation.mutate({ id: reasonId, values: body });
        }
      })
      .catch(() => {});
  }, [form, mode, reasonId, systemLocked, createMutation, updateMutation]);

  const directionOptions = useMemo(
    () =>
      STOCK_ADJUSTMENT_REASON_DIRECTIONS.map((value) => ({
        value,
        label: getAdjustmentReasonDirectionLabel(t, value),
      })),
    [t],
  );

  const title =
    mode === "create"
      ? t("adjReasonDrawerTitleCreate")
      : mode === "view"
        ? t("adjReasonDrawerTitleView")
        : t("adjReasonDrawerTitleEdit");

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={detailEnabled && detailQuery.isLoading}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        readOnly ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button onClick={forceClose}>{t("drawerClose")}</Button>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button onClick={requestClose} disabled={submitting}>
              {t("drawerCancel")}
            </Button>
            <Button type="primary" disabled={!canSubmit || submitting} loading={submitting} onClick={handleSave}>
              {t("drawerSave")}
            </Button>
          </div>
        )
      }
    >
      <Form form={form} layout="vertical" disabled={readOnly}>
        <Form.Item
          name="code"
          label={t("adjReasonFieldCode")}
          rules={[
            { required: true, message: t("adjReasonCodeRequired") },
            { max: 32, message: t("adjReasonCodeMax") },
          ]}
        >
          <Input autoComplete="off" disabled={readOnly || systemLocked} />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("adjReasonFieldName")}
          rules={[
            { required: true, message: t("adjReasonNameRequired") },
            { max: 120, message: t("adjReasonNameMax") },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="direction"
          label={t("adjReasonFieldDirection")}
          rules={[{ required: true, message: t("adjReasonDirectionRequired") }]}
        >
          <Select options={directionOptions} />
        </Form.Item>
        <Form.Item name="is_active" label={t("adjReasonFieldActive")} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="notes" label={t("adjReasonFieldNotes")}>
          <Input.TextArea rows={3} maxLength={2000} showCount />
        </Form.Item>
      </Form>
    </ResourceCrudDrawer>
  );
}
