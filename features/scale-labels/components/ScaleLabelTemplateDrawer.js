"use client";

import { SCALE_BARCODE_FORMATS_QUERY_KEY, fetchScaleBarcodeFormats } from "@/features/scale-barcodes/api/scaleBarcodes.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { notifyPersistedSaveIntent, usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { EyeOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Checkbox, Divider, Form, Input, Select, Switch, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SCALE_LABEL_TEMPLATES_QUERY_KEY,
  createScaleLabelTemplate,
  fetchScaleLabelTemplate,
  previewScaleLabel,
  updateScaleLabelTemplate,
} from "../api/scaleLabels.api";
import { LABEL_FIELDS, SIZE_PRESETS, toFormValues, toPayload } from "../utils/labelTemplate";

const SAVE_INTENT_KEY = "scaleLabelTemplateDrawer:createSaveIntent";
const SAVE_INTENT_EVENT = "scaleLabelTemplateDrawer:createSaveIntent:change";

/**
 * Weighed-item label layout: size (roll or A4 grid), what it shows, which barcode format, and a PDF preview.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; templateId: number | null; tableSeedRecord?: Record<string, any> | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function ScaleLabelTemplateDrawer({ open, mode, templateId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("ScaleLabels");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("scale_barcode_formats");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const creating = mode === "create" || templateId == null;
  const readOnly = mode === "view" || (creating ? !access.canAdd : !access.canEdit);
  const [dirty, setDirty] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(/** @type {string | null} */ (null));
  const [previewError, setPreviewError] = useState(/** @type {string | null} */ (null));
  const urlRef = useRef(/** @type {string | null} */ (null));
  const lastCreateIntent = usePersistedSaveIntent(SAVE_INTENT_KEY, SAVE_INTENT_EVENT);
  const values = Form.useWatch([], form) ?? {};
  const sheet = values.mode === "sheet";
  const required = (label) => [{ required: true, message: t("fieldRequired", { field: label }) }];

  const detail = useQuery({
    queryKey: [...SCALE_LABEL_TEMPLATES_QUERY_KEY, "detail", templateId],
    queryFn: () => fetchScaleLabelTemplate(/** @type {number} */ (templateId)),
    enabled: open && !creating,
    placeholderData: tableSeedRecord ?? undefined,
  });
  const formats = useQuery({
    queryKey: [...SCALE_BARCODE_FORMATS_QUERY_KEY, "active-all"],
    queryFn: () => fetchScaleBarcodeFormats({ per_page: 100, active: "1" }),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const loadedFor = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    const stamp = creating ? "create" : `${templateId}:${detail.dataUpdatedAt}`;
    const record = creating ? {} : detail.data;
    if (record && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.resetFields();
      form.setFieldsValue(toFormValues(record));
      setDirty(false);
    }
  }, [open, creating, templateId, detail.data, detail.dataUpdatedAt, form]);

  const showPreview = useCallback((url) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setPreviewUrl(url);
  }, []);

  const closeDrawer = useCallback(() => {
    showPreview(null);
    setPreviewError(null);
    onClose();
  }, [onClose, showPreview]);
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose: closeDrawer, shouldConfirmDiscard: () => dirty });

  const save = useMutation({
    mutationFn: ({ payload }) => (creating ? createScaleLabelTemplate(payload) : updateScaleLabelTemplate(/** @type {number} */ (templateId), payload)),
    onSuccess: (record, { intent }) => {
      message.success(t("saved"));
      invalidateTenantListQueries(queryClient, SCALE_LABEL_TEMPLATES_QUERY_KEY);
      if (!creating) {
        forceClose();
        return;
      }
      try {
        localStorage.setItem(SAVE_INTENT_KEY, intent);
      } catch {
        /* ignore */
      }
      notifyPersistedSaveIntent(SAVE_INTENT_EVENT);
      if (intent === "keep") {
        setDirty(false);
        onCreated?.(record);
        return;
      }
      if (intent === "new") {
        form.resetFields();
        form.setFieldsValue(toFormValues({}));
        setDirty(false);
        return;
      }
      forceClose();
    },
    onError: (error) => notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const preview = useMutation({
    mutationFn: () => previewScaleLabel({ template: { ...toPayload(form.getFieldsValue(true)), name: values.name || "preview" } }),
    onSuccess: (blob) => {
      setPreviewError(null);
      showPreview(URL.createObjectURL(new Blob([blob], { type: "application/pdf" })));
    },
    onError: (error) => {
      showPreview(null);
      setPreviewError(getLocalizedApiErrorMessage(tApiErrors, error));
    },
  });

  const submit = useCallback(
    (intent) =>
      form
        .validateFields()
        .then((v) => save.mutate({ payload: toPayload({ ...form.getFieldsValue(true), ...v }), intent }))
        .catch(() => {}),
    [form, save],
  );
  const createIntentLabel = useCallback(
    (intent) => (intent === "keep" ? t("drawerSave") : intent === "new" ? t("drawerSaveAndNew") : t("drawerSaveAndClose")),
    [t],
  );
  const createSaveMenuItems = useMemo(
    () => ["keep", "new", "close"].filter((key) => key !== lastCreateIntent).map((key) => ({ key, label: createIntentLabel(key) })),
    [lastCreateIntent, createIntentLabel],
  );

  const applyPreset = (key) => {
    form.setFieldsValue(SIZE_PRESETS[/** @type {keyof typeof SIZE_PRESETS} */ (key)]);
    setDirty(true);
  };

  const formatRows = Array.isArray(formats.data?.rows) ? formats.data.rows : Array.isArray(formats.data?.data) ? formats.data.data : Array.isArray(formats.data) ? formats.data : [];
  const formatOptions = formatRows.map((f) => ({ value: Number(f.id), label: f.name }));
  const mm = (name, label, help, { min = 0, max = 300 } = {}) => (
    <Form.Item name={name} label={label} tooltip={help} rules={required(label)}>
      <TenantNumberInput kind="quantity" min={min} max={max} className="w-full" />
    </Form.Item>
  );
  const title = creating ? t("add") : readOnly ? (detail.data?.name ?? t("title")) : `${t("edit")} ${detail.data?.name ?? ""}`;

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={save.isPending}
      showDetailLoading={!creating && detail.isPending}
      detailLoadFailed={!creating && detail.isError}
      detailError={detail.error}
      tApiErrors={tApiErrors}
      size={820}
      footer={
        <ResourceDrawerFooter
          mode={readOnly ? "view" : creating ? "create" : "edit"}
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={save.isPending}
          createSaveDisabled={save.isPending}
          lastCreateIntent={lastCreateIntent}
          runCreate={submit}
          createIntentLabel={createIntentLabel}
          createSaveMenuItems={createSaveMenuItems}
          handleEditSubmit={() => !readOnly && submit("close")}
          canSubmitRequired
          fetchRemoteDetail={!creating}
          detailEnabled={!creating}
          detailQueryError={detail.isError}
        />
      }
    >
      <Form form={form} layout="vertical" disabled={readOnly} requiredMark={readOnly ? false : "optional"} onValuesChange={() => setDirty(true)}>
        <section>
          <ResourceDrawerPanelHeader title={t("sectionGeneral")} />
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="name" label={t("name")} rules={required(t("name"))}>
              <Input maxLength={120} placeholder={t("namePlaceholder")} />
            </Form.Item>
            <Form.Item name="scale_barcode_format_id" label={t("barcodeFormat")} tooltip={t("barcodeFormatHelp")}>
              <Select allowClear options={formatOptions} loading={formats.isPending} placeholder={t("noBarcode")} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
          </div>
          <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3 sm:w-1/2">
            <ResourceDrawerFieldLabel text={t("active")} help={t("activeHelp")} />
            <Form.Item name="is_active" valuePropName="checked" noStyle>
              <Switch disabled={readOnly} />
            </Form.Item>
          </div>
        </section>

        <Divider className="!mb-6 !mt-0" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionSize")} help={t("sectionSizeHelp")} />
          {!readOnly ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Typography.Text type="secondary" className="text-sm">
                {t("presets")}
              </Typography.Text>
              {Object.keys(SIZE_PRESETS).map((key) => (
                <Button key={key} size="small" onClick={() => applyPreset(key)}>
                  {t(`preset_${key}`)}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
            <Form.Item name="mode" label={t("mode")} tooltip={t("modeHelp")}>
              <Select options={["single", "sheet"].map((v) => ({ value: v, label: t(`mode_${v}`) }))} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
            {mm("width_mm", t("widthMm"), t("widthHelp"), { min: 15, max: 200 })}
            {mm("height_mm", t("heightMm"), t("heightHelp"), { min: 10, max: 300 })}
            <Form.Item name="font_size" label={t("fontSize")} tooltip={t("fontSizeHelp")}>
              <TenantNumberInput kind="integer" min={5} max={24} className="w-full" />
            </Form.Item>
          </div>
          {sheet ? (
            <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
              <Form.Item name="sheet_columns" label={t("sheetColumns")} tooltip={t("sheetHelp")}>
                <TenantNumberInput kind="integer" min={1} max={10} className="w-full" />
              </Form.Item>
              <Form.Item name="sheet_rows" label={t("sheetRows")} tooltip={t("sheetHelp")}>
                <TenantNumberInput kind="integer" min={1} max={30} className="w-full" />
              </Form.Item>
              {mm("margin_mm", t("marginMm"), t("marginHelp"), { max: 50 })}
              {mm("gap_mm", t("gapMm"), t("gapHelp"), { max: 30 })}
            </div>
          ) : null}
        </section>

        <Divider className="!mb-6 !mt-0" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionFields")} help={t("sectionFieldsHelp")} />
          <Form.Item name="fields" rules={[{ type: "array", min: 1, message: t("fieldsRequired") }]}>
            <Checkbox.Group className="grid grid-cols-2 gap-2 sm:grid-cols-3" options={LABEL_FIELDS.map((f) => ({ value: f, label: t(`labelField_${f}`) }))} />
          </Form.Item>
        </section>
      </Form>

      <Divider className="!mb-6 !mt-0" />

      <section>
        <ResourceDrawerPanelHeader title={t("sectionPreview")} help={t("sectionPreviewHelp")} />
        <Button icon={<EyeOutlined />} loading={preview.isPending} onClick={() => preview.mutate()}>
          {t("previewButton")}
        </Button>
        {previewError ? <Alert className="!mt-3" type="error" showIcon title={previewError} /> : null}
        {previewUrl ? <iframe title={t("sectionPreview")} src={previewUrl} className="mt-3 h-[420px] w-full rounded border border-solid border-[var(--ant-color-border)]" /> : null}
      </section>
    </ResourceCrudDrawer>
  );
}
