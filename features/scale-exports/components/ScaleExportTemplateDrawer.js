"use client";

import { fetchBranchNames } from "@/features/branches/api/branches.api";
import { fetchCategoryNames } from "@/features/categories/api/categories.api";
import { fetchPriceListNames } from "@/features/price-lists/api/priceLists.api";
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
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Divider, Form, Input, Select, Switch, Table, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SCALE_EXPORT_STATUS_QUERY_KEY,
  SCALE_EXPORT_TEMPLATES_QUERY_KEY,
  createScaleExportTemplate,
  fetchScaleExportTemplate,
  previewScaleExportDraft,
  updateScaleExportTemplate,
} from "../api/scaleExports.api";
import { DELIMITERS, ENCODINGS, EXPORT_FIELDS, EXTENSIONS, LINE_ENDINGS, PRESETS, QUOTES, toFormValues, toPayload } from "../utils/exportTemplate";

const SAVE_INTENT_KEY = "scaleExportTemplateDrawer:createSaveIntent";
const SAVE_INTENT_EVENT = "scaleExportTemplateDrawer:createSaveIntent:change";

/** @param {{ name: string; label: string; help: string; disabled?: boolean }} props */
function SwitchRow({ name, label, help, disabled }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3">
      <ResourceDrawerFieldLabel text={label} help={help} />
      <Form.Item name={name} valuePropName="checked" noStyle>
        <Switch disabled={disabled} />
      </Form.Item>
    </div>
  );
}

/**
 * How the item file for a scale's PC software is written: which items and prices, file format, columns,
 * and a preview of the first rows.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; templateId: number | null; tableSeedRecord?: Record<string, any> | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function ScaleExportTemplateDrawer({ open, mode, templateId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("ScaleExports");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("scale_barcode_formats");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const creating = mode === "create" || templateId == null;
  const readOnly = mode === "view" || (creating ? !access.canAdd : !access.canEdit);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(/** @type {Record<string, any> | null} */ (null));
  const lastCreateIntent = usePersistedSaveIntent(SAVE_INTENT_KEY, SAVE_INTENT_EVENT);
  const values = Form.useWatch([], form) ?? {};
  const fixedWidth = values.delimiter === "fixed";
  const required = (label) => [{ required: true, message: t("fieldRequired", { field: label }) }];

  const detail = useQuery({
    queryKey: [...SCALE_EXPORT_TEMPLATES_QUERY_KEY, "detail", templateId],
    queryFn: () => fetchScaleExportTemplate(/** @type {number} */ (templateId)),
    enabled: open && !creating,
    placeholderData: tableSeedRecord ?? undefined,
  });
  const branches = useQuery({ queryKey: ["tenant", "branches", "names"], queryFn: fetchBranchNames, enabled: open, staleTime: QUERY_STALE_TIME.catalog });
  const categories = useQuery({ queryKey: ["tenant", "categories", "names"], queryFn: fetchCategoryNames, enabled: open, staleTime: QUERY_STALE_TIME.catalog });
  const priceLists = useQuery({ queryKey: ["tenant", "price-lists", "names"], queryFn: fetchPriceListNames, enabled: open, staleTime: QUERY_STALE_TIME.catalog });

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

  const closeDrawer = useCallback(() => {
    setPreview(null);
    onClose();
  }, [onClose]);
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose: closeDrawer, shouldConfirmDiscard: () => dirty });

  const save = useMutation({
    mutationFn: ({ payload }) => (creating ? createScaleExportTemplate(payload) : updateScaleExportTemplate(/** @type {number} */ (templateId), payload)),
    onSuccess: (record, { intent }) => {
      message.success(t("saved"));
      invalidateTenantListQueries(queryClient, SCALE_EXPORT_TEMPLATES_QUERY_KEY);
      queryClient.invalidateQueries({ queryKey: SCALE_EXPORT_STATUS_QUERY_KEY });
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
        setPreview(null);
        return;
      }
      forceClose();
    },
    onError: (error) => notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const runPreview = useMutation({
    mutationFn: () => previewScaleExportDraft({ ...toPayload(form.getFieldsValue(true)), name: values.name || "preview" }),
    onSuccess: (result) => setPreview(result),
    onError: (error) => setPreview({ requestError: getLocalizedApiErrorMessage(tApiErrors, error) }),
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
    const preset = PRESETS[/** @type {keyof typeof PRESETS} */ (key)];
    form.setFieldsValue({ ...preset, columns: preset.columns.map((c) => ({ ...c, map_weight: "", map_piece: "" })) });
    setDirty(true);
    setPreview(null);
  };

  const options = (data) => (Array.isArray(data) ? data : []).map((r) => ({ value: Number(r.id), label: r.name }));
  const opt = (list, prefix) => list.map((v) => ({ value: v, label: t(`${prefix}_${v === "," ? "comma" : v === ";" ? "semicolon" : v === "|" ? "pipe" : v}`) }));
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
      size={900}
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
          <ResourceDrawerPanelHeader title={t("sectionGeneral")} help={t("sectionGeneralHelp")} />
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="name" label={t("name")} rules={required(t("name"))}>
              <Input maxLength={120} placeholder={t("namePlaceholder")} />
            </Form.Item>
            <Form.Item name="branch_id" label={t("branch")} tooltip={t("branchHelp")}>
              <Select allowClear options={options(branches.data)} placeholder={t("allBranches")} getPopupContainer={drawerSelectGetPopup} optionFilterProp="label" showSearch />
            </Form.Item>
            <Form.Item name="price_source" label={t("priceSource")} tooltip={t("priceSourceHelp")}>
              <Select options={["item_price", "price_list"].map((v) => ({ value: v, label: t(`priceSource_${v}`) }))} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
            {values.price_source === "price_list" ? (
              <Form.Item name="price_list_id" label={t("priceList")} tooltip={t("priceListHelp")} rules={required(t("priceList"))}>
                <Select options={options(priceLists.data)} getPopupContainer={drawerSelectGetPopup} optionFilterProp="label" showSearch />
              </Form.Item>
            ) : null}
          </div>
          <Form.Item name="category_ids" label={t("categories")} tooltip={t("categoriesHelp")}>
            <Select mode="multiple" allowClear options={options(categories.data)} placeholder={t("allCategories")} getPopupContainer={drawerSelectGetPopup} optionFilterProp="label" />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <SwitchRow name="is_active" label={t("active")} help={t("activeHelp")} disabled={readOnly} />
          </div>
        </section>

        <Divider className="!mb-6 !mt-0" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionFile")} help={t("sectionFileHelp")} />
          {!readOnly ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Typography.Text type="secondary" className="text-sm">
                {t("presets")}
              </Typography.Text>
              {Object.keys(PRESETS).map((key) => (
                <Button key={key} size="small" onClick={() => applyPreset(key)}>
                  {t(`preset_${key}`)}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
            <Form.Item name="file_extension" label={t("fileExtension")} tooltip={t("fileExtensionHelp")}>
              <Select options={EXTENSIONS.map((v) => ({ value: v, label: `.${v}` }))} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
            {values.file_extension !== "xlsx" ? (
              <>
                <Form.Item name="delimiter" label={t("delimiter")} tooltip={t("delimiterHelp")}>
                  <Select options={opt(DELIMITERS, "delimiter")} getPopupContainer={drawerSelectGetPopup} />
                </Form.Item>
                <Form.Item name="encoding" label={t("encoding")} tooltip={t("encodingHelp")}>
                  <Select options={opt(ENCODINGS, "encoding")} getPopupContainer={drawerSelectGetPopup} />
                </Form.Item>
                {!fixedWidth ? (
                  <Form.Item name="quote" label={t("quote")} tooltip={t("quoteHelp")}>
                    <Select options={opt(QUOTES, "quote")} getPopupContainer={drawerSelectGetPopup} />
                  </Form.Item>
                ) : null}
                <Form.Item name="line_ending" label={t("lineEnding")} tooltip={t("lineEndingHelp")}>
                  <Select options={opt(LINE_ENDINGS, "lineEnding")} getPopupContainer={drawerSelectGetPopup} />
                </Form.Item>
              </>
            ) : null}
            <Form.Item name="decimal_separator" label={t("decimalSeparator")} tooltip={t("decimalSeparatorHelp")}>
              <Select options={[{ value: ".", label: "1.50" }, { value: ",", label: "1,50" }]} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
            <Form.Item name="price_decimals" label={t("priceDecimals")} tooltip={t("priceDecimalsHelp")}>
              <TenantNumberInput kind="integer" min={0} max={6} className="w-full" />
            </Form.Item>
            <Form.Item name="price_multiplier" label={t("priceMultiplier")} tooltip={t("priceMultiplierHelp")}>
              <TenantNumberInput kind="quantity" min={0.000001} className="w-full" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <SwitchRow name="has_header" label={t("hasHeader")} help={t("hasHeaderHelp")} disabled={readOnly} />
          </div>
        </section>

        <Divider className="!mb-6 !mt-0" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionColumns")} help={t("sectionColumnsHelp")} />
          <Form.List name="columns" rules={[{ validator: (_, v) => (Array.isArray(v) && v.length ? Promise.resolve() : Promise.reject(new Error(t("columnsRequired")))) }]}>
            {(fields, { add, remove, move }, { errors }) => (
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => {
                  const column = values.columns?.[field.name] ?? {};
                  return (
                    <div key={field.key} className="flex flex-wrap items-start gap-2 rounded-md border border-solid border-[var(--ant-color-border-secondary)] p-2">
                      <Typography.Text type="secondary" className="w-6 pt-1 text-center text-xs">
                        {index + 1}
                      </Typography.Text>
                      <Form.Item name={[field.name, "field"]} noStyle rules={required(t("columnField"))}>
                        <Select
                          className="min-w-44"
                          options={EXPORT_FIELDS.map((f) => ({ value: f, label: t(`field_${f}`) }))}
                          getPopupContainer={drawerSelectGetPopup}
                          aria-label={t("columnField")}
                        />
                      </Form.Item>
                      <Form.Item name={[field.name, "header"]} noStyle>
                        <Input className="!w-36" placeholder={t("columnHeader")} aria-label={t("columnHeader")} maxLength={60} />
                      </Form.Item>
                      {column.field === "constant" ? (
                        <Form.Item name={[field.name, "constant"]} noStyle>
                          <Input className="!w-28" placeholder={t("columnConstant")} aria-label={t("columnConstant")} maxLength={60} />
                        </Form.Item>
                      ) : null}
                      {column.field === "price_type" ? (
                        <>
                          <Form.Item name={[field.name, "map_weight"]} noStyle>
                            <Input className="!w-24" placeholder={t("mapWeight")} aria-label={t("mapWeight")} maxLength={20} />
                          </Form.Item>
                          <Form.Item name={[field.name, "map_piece"]} noStyle>
                            <Input className="!w-24" placeholder={t("mapPiece")} aria-label={t("mapPiece")} maxLength={20} />
                          </Form.Item>
                        </>
                      ) : null}
                      {fixedWidth || column.field === "plu_padded" ? (
                        <Form.Item name={[field.name, "width"]} noStyle>
                          <TenantNumberInput kind="integer" min={1} max={200} className="!w-20" placeholder={t("columnWidth")} aria-label={t("columnWidth")} />
                        </Form.Item>
                      ) : null}
                      {fixedWidth ? (
                        <>
                          <Form.Item name={[field.name, "pad_char"]} noStyle>
                            <Input className="!w-16" maxLength={1} placeholder={t("columnPad")} aria-label={t("columnPad")} />
                          </Form.Item>
                          <Form.Item name={[field.name, "pad_side"]} noStyle>
                            <Select
                              className="!w-28"
                              allowClear
                              placeholder={t("columnPadSide")}
                              options={["left", "right"].map((v) => ({ value: v, label: t(`padSide_${v}`) }))}
                              getPopupContainer={drawerSelectGetPopup}
                            />
                          </Form.Item>
                        </>
                      ) : null}
                      {!readOnly ? (
                        <div className="ms-auto flex gap-1">
                          <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={t("moveUp")} />
                          <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label={t("moveDown")} />
                          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label={t("removeColumn")} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <Form.ErrorList errors={errors} />
                {!readOnly ? (
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ field: "name", header: "" })} className="self-start">
                    {t("addColumn")}
                  </Button>
                ) : null}
              </div>
            )}
          </Form.List>
        </section>
      </Form>

      <Divider className="!mb-6 !mt-6" />

      <section>
        <ResourceDrawerPanelHeader title={t("sectionPreview")} help={t("sectionPreviewHelp")} />
        <Button icon={<EyeOutlined />} loading={runPreview.isPending} onClick={() => runPreview.mutate()} disabled={false}>
          {t("previewButton")}
        </Button>
        {preview?.requestError ? <Alert className="!mt-3" type="error" showIcon title={preview.requestError} /> : null}
        {preview && !preview.requestError ? (
          <div className="mt-3">
            <Typography.Text type="secondary" className="text-sm">
              {t("previewCount", { count: preview.item_count ?? 0, shown: preview.rows?.length ?? 0 })}
              {preview.currency ? ` ${t("previewCurrency", { code: preview.currency.code, symbol: preview.currency.symbol || preview.currency.code })}` : ""}
            </Typography.Text>
            {Number(preview.missing_price?.count ?? 0) > 0 ? (
              <Alert
                className="!mt-2"
                type="warning"
                showIcon
                title={t("missingListPrice", { count: Number(preview.missing_price.count) })}
                description={
                  <span dir="auto">
                    {(preview.missing_price.names ?? []).join(", ")}
                    {preview.missing_price.count > (preview.missing_price.names ?? []).length ? "…" : ""}
                  </span>
                }
              />
            ) : null}
            <Table
              className="mt-2"
              size="small"
              bordered
              pagination={false}
              scroll={{ x: true }}
              rowKey="__key"
              dataSource={(preview.rows ?? []).map((row, i) => ({ ...row, __key: String(i) }))}
              columns={(preview.headers ?? []).map((h, i) => ({ title: h || `#${i + 1}`, dataIndex: String(i), key: String(i), render: (v) => <span dir="auto">{v}</span> }))}
              locale={{ emptyText: t("previewEmpty") }}
            />
          </div>
        ) : null}
      </section>
    </ResourceCrudDrawer>
  );
}
