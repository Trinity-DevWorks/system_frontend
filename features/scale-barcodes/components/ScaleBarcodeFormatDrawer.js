"use client";

import { fetchBranchNames } from "@/features/branches/api/branches.api";
import { fetchCurrencyNames } from "@/features/currencies/api/currencies.api";
import { fetchUnitOfMeasurementNames } from "@/features/unit-of-measurements/api/unitOfMeasurements.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { notifyPersistedSaveIntent, usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Divider, Form, Input, Select, Space, Switch, Tag, Tooltip, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SCALE_BARCODE_FORMATS_QUERY_KEY,
  createScaleBarcodeFormat,
  fetchScaleBarcodeFormat,
  testScaleBarcode,
  updateScaleBarcodeFormat,
} from "../api/scaleBarcodes.api";
import {
  PRESETS,
  SYMBOLOGIES,
  SYMBOLOGY_LENGTH,
  VALUE_TYPES,
  engineFor,
  layoutCells,
  toFormValues,
  toPayload,
} from "../utils/scaleBarcodeFormat";

const SAVE_INTENT_KEY = "scaleBarcodeFormatDrawer:createSaveIntent";
const SAVE_INTENT_EVENT = "scaleBarcodeFormatDrawer:createSaveIntent:change";

/** @type {Record<string, string>} */
const ROLE_COLORS = {
  prefix: "var(--ant-color-text-tertiary)",
  plu: "var(--ant-color-primary)",
  value: "var(--ant-color-success)",
  priceCheck: "var(--ant-color-warning)",
  check: "var(--ant-color-error)",
  other: "var(--ant-color-border)",
};

/**
 * A switch with its label and a `?` help on the left, in a bordered row (half width in a grid).
 *
 * @param {{ name: string; label: string; help: string; disabled?: boolean }} props
 */
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
 * Which digit is what: prefix / PLU / value / price check / check digit.
 *
 * @param {{ values: Record<string, any>; t: (key: string) => string }} props
 */
function LayoutDiagram({ values, t }) {
  const cells = layoutCells(values);
  if (cells.length === 0) return null;
  const roles = ["prefix", "plu", "value", "priceCheck", "check"].filter((role) => cells.some((c) => c.role === role));
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-1" dir="ltr">
        {cells.map((cell) => (
          <Tooltip key={cell.index} title={`${cell.index} · ${t(`role_${cell.role}`)}`}>
            <div
              className="flex h-8 w-7 items-center justify-center rounded text-xs font-medium"
              style={{ border: `2px solid ${ROLE_COLORS[cell.role]}` }}
            >
              {cell.index}
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {roles.map((role) => (
          <span key={role} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ROLE_COLORS[role] }} />
            {t(`role_${role}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Scale label format: where the PLU and the weight / price / count sit, what they mean, and a box to
 * try real labels before saving.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; formatId: number | null; tableSeedRecord?: Record<string, any> | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function ScaleBarcodeFormatDrawer({ open, mode, formatId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("ScaleBarcodes");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("scale_barcode_formats");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const creating = mode === "create" || formatId == null;
  const readOnly = mode === "view" || (creating ? !access.canAdd : !access.canEdit);
  const [dirty, setDirty] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [testResult, setTestResult] = useState(/** @type {Record<string, any> | null} */ (null));
  const lastCreateIntent = usePersistedSaveIntent(SAVE_INTENT_KEY, SAVE_INTENT_EVENT);
  const values = Form.useWatch([], form) ?? {};
  const engine = engineFor(values.symbology);
  const isPrice = values.value_type === "price";
  // GS1 weights say their own unit (310n kg / 320n lb), so no unit to choose.
  const gs1Weight = engine === "gs1" && values.value_type === "weight";
  const required = (label) => [{ required: true, message: t("fieldRequired", { field: label }) }];

  const detail = useQuery({
    queryKey: [...SCALE_BARCODE_FORMATS_QUERY_KEY, "detail", formatId],
    queryFn: () => fetchScaleBarcodeFormat(/** @type {number} */ (formatId)),
    enabled: open && !creating,
    placeholderData: tableSeedRecord ?? undefined,
  });
  const units = useQuery({ queryKey: ["tenant", "unit-of-measurements", "names"], queryFn: fetchUnitOfMeasurementNames, enabled: open, staleTime: QUERY_STALE_TIME.catalog });
  const currencies = useQuery({ queryKey: ["tenant", "currencies", "names"], queryFn: fetchCurrencyNames, enabled: open, staleTime: QUERY_STALE_TIME.catalog });
  const branches = useQuery({ queryKey: ["tenant", "branches", "names"], queryFn: fetchBranchNames, enabled: open, staleTime: QUERY_STALE_TIME.catalog });

  const loadedFor = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    const stamp = creating ? "create" : `${formatId}:${detail.dataUpdatedAt}`;
    const record = creating ? {} : detail.data;
    if (record && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.resetFields();
      form.setFieldsValue(toFormValues(record));
      setDirty(false);
    }
  }, [open, creating, formatId, detail.data, detail.dataUpdatedAt, form]);

  const closeDrawer = useCallback(() => {
    setTestResult(null);
    setTestCode("");
    onClose();
  }, [onClose]);
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose: closeDrawer, shouldConfirmDiscard: () => dirty });

  const save = useMutation({
    mutationFn: ({ payload }) => (creating ? createScaleBarcodeFormat(payload) : updateScaleBarcodeFormat(/** @type {number} */ (formatId), payload)),
    onSuccess: (record, { intent }) => {
      message.success(t("saved"));
      invalidateTenantListQueries(queryClient, SCALE_BARCODE_FORMATS_QUERY_KEY);
      const tooLong = Array.isArray(record?.warnings?.plu_too_long) ? record.warnings.plu_too_long : [];
      if (tooLong.length) {
        notification.warning({
          title: t("warningPluTooLongTitle", { count: tooLong.length }),
          description: tooLong.slice(0, 8).map((i) => `${i.name} (${i.plu_code})`).join(", "),
          duration: 10,
        });
      }
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
        setTestResult(null);
        return;
      }
      forceClose();
    },
    onError: (error) => notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const test = useMutation({
    mutationFn: () => testScaleBarcode({ ...toPayload(form.getFieldsValue(true)), name: values.name || "test" }, testCode.trim()),
    onSuccess: (result) => setTestResult(result),
    onError: (error) => setTestResult({ requestError: getLocalizedApiErrorMessage(tApiErrors, error) }),
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
    form.setFieldsValue({ ...preset, total_length: SYMBOLOGY_LENGTH[preset.symbology] ?? null });
    setDirty(true);
    setTestResult(null);
  };

  const unitOptions = (Array.isArray(units.data) ? units.data : []).map((u) => ({ value: Number(u.id), label: [u.code, u.name].filter(Boolean).join(" — ") }));
  const currencyOptions = (Array.isArray(currencies.data) ? currencies.data : []).map((c) => ({ value: Number(c.id), label: [c.code, c.name].filter(Boolean).join(" — ") }));
  const branchOptions = (Array.isArray(branches.data) ? branches.data : []).map((b) => ({ value: Number(b.id), label: b.name }));
  const numberField = (name, label, help, { min = 1, max = 80, rules = undefined } = {}) => (
    <Form.Item name={name} label={label} tooltip={help} rules={rules}>
      <TenantNumberInput kind="integer" min={min} max={max} className="w-full" />
    </Form.Item>
  );
  const title = creating ? t("add") : readOnly ? (detail.data?.name ?? t("title")) : `${t("edit")} ${detail.data?.name ?? ""}`;
  const line = testResult?.line;

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
      size={780}
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
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Form.Item name="name" label={t("name")} rules={required(t("name"))}>
              <Input maxLength={120} placeholder={t("namePlaceholder")} />
            </Form.Item>
            {numberField("priority", t("priority"), t("priorityHelp"), { min: 0, max: 100000 })}
          </div>
          <Form.Item name="branch_ids" label={t("branches")} tooltip={t("branchesHelp")}>
            <Select mode="multiple" allowClear options={branchOptions} placeholder={t("allBranches")} getPopupContainer={drawerSelectGetPopup} optionFilterProp="label" />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <SwitchRow name="is_active" label={t("active")} help={t("activeHelp")} disabled={readOnly} />
          </div>
        </section>

        <Divider className="!mb-6 !mt-0" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionLayout")} help={t("sectionLayoutHelp")} />
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
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="symbology" label={t("symbology")} tooltip={t("symbologyHelp")} rules={required(t("symbology"))}>
              <Select options={SYMBOLOGIES.map((s) => ({ value: s, label: t(`symbology_${s}`) }))} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
            <Form.Item name="prefixes" label={t("prefixes")} tooltip={engine === "gs1" ? t("prefixesGs1Help") : t("prefixesHelp")}>
              <Select mode="tags" tokenSeparators={[",", " "]} open={false} placeholder="21, 22" />
            </Form.Item>
          </div>
          {engine === "fixed" ? (
            <>
              {SYMBOLOGY_LENGTH[values.symbology] == null
                ? numberField("total_length", t("totalLength"), t("totalLengthHelp"), { min: 4, max: 80 })
                : null}
              <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
                {numberField("plu_start", t("pluStart"), t("positionHelp"), { rules: required(t("pluStart")) })}
                {numberField("plu_length", t("pluLength"), t("pluLengthHelp"), { max: 20, rules: required(t("pluLength")) })}
                {numberField("value_start", t("valueStart"), t("positionHelp"), { rules: required(t("valueStart")) })}
                {numberField("value_length", t("valueLength"), t("valueLengthHelp"), { max: 20, rules: required(t("valueLength")) })}
              </div>
              <LayoutDiagram values={values} t={t} />
            </>
          ) : (
            <>
              <Alert className="!mb-4" type="info" showIcon title={t("gs1Info")} />
              <div className="grid grid-cols-2 gap-x-4">
                {numberField("plu_start", t("gs1PluStart"), t("gs1PluHelp"), { max: 14 })}
                {numberField("plu_length", t("pluLength"), t("gs1PluHelp"), { max: 14 })}
              </div>
            </>
          )}
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <SwitchRow name="verify_check_digit" label={t("verifyCheckDigit")} help={t("verifyCheckDigitHelp")} disabled={readOnly} />
          </div>
        </section>

        <Divider className="!mb-6 !mt-0" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionValue")} help={t("sectionValueHelp")} />
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
            <Form.Item name="value_type" label={t("valueType")} tooltip={t("valueTypeHelp")} rules={required(t("valueType"))}>
              <Select options={VALUE_TYPES.map((v) => ({ value: v, label: t(`type_${v}`) }))} getPopupContainer={drawerSelectGetPopup} />
            </Form.Item>
            {engine === "fixed" ? numberField("decimals", t("decimals"), t("decimalsHelp"), { min: 0, max: 6 }) : null}
            {engine === "fixed" ? (
              <Form.Item name="multiplier" label={t("multiplier")} tooltip={t("multiplierHelp")}>
                <TenantNumberInput kind="quantity" min={0.000001} className="w-full" />
              </Form.Item>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {gs1Weight ? (
              <Alert className="!mb-6 sm:col-span-2" type="info" showIcon title={t("unitGs1Help")} />
            ) : (
              <Form.Item
                name="uom_id"
                label={t("unit")}
                tooltip={isPrice ? t("unitPriceHelp") : t("unitHelp")}
                rules={isPrice ? undefined : required(t("unit"))}
              >
                <Select allowClear showSearch optionFilterProp="label" options={unitOptions} loading={units.isPending} getPopupContainer={drawerSelectGetPopup} />
              </Form.Item>
            )}
            {isPrice ? (
              <Form.Item name="currency_id" label={t("currency")} tooltip={t("currencyHelp")}>
                <Select allowClear showSearch optionFilterProp="label" options={currencyOptions} placeholder={t("primaryCurrency")} loading={currencies.isPending} getPopupContainer={drawerSelectGetPopup} />
              </Form.Item>
            ) : null}
          </div>
          {isPrice ? (
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <SwitchRow name="price_includes_tax" label={t("priceIncludesTax")} help={t("priceIncludesTaxHelp")} disabled={readOnly} />
              {engine === "fixed" ? numberField("price_check_digit_position", t("priceCheckDigit"), t("priceCheckDigitHelp")) : null}
            </div>
          ) : null}
        </section>
      </Form>

      <Divider className="!mb-6 !mt-0" />

      <section>
        <ResourceDrawerPanelHeader title={t("sectionTest")} help={t("sectionTestHelp")} />
        <Space.Compact className="w-full">
          <Input
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            onPressEnter={() => testCode.trim() && test.mutate()}
            placeholder={t("testPlaceholder")}
            className="font-mono"
            dir="ltr"
          />
          <Button type="primary" loading={test.isPending} disabled={!testCode.trim()} onClick={() => test.mutate()}>
            {t("testButton")}
          </Button>
        </Space.Compact>
        {testResult ? (
          <div className="mt-3">
            {testResult.requestError ? (
              <Alert type="error" showIcon title={testResult.requestError} />
            ) : !testResult.matched ? (
              <Alert type="warning" showIcon title={t("testNoMatch")} />
            ) : testResult.error ? (
              <Alert
                type="warning"
                showIcon
                title={t("testReadButError")}
                description={
                  <>
                    <div>{t("testParsed", { plu: testResult.parsed?.plu ?? testResult.parsed?.gtin ?? "", value: testResult.parsed?.value != null ? Number(testResult.parsed.value) : "" })}</div>
                    <div>
                      {testResult.error.code
                        ? tApiErrors.has(`codes.${testResult.error.code}`)
                          ? tApiErrors(`codes.${testResult.error.code}`, testResult.error.params ?? {})
                          : testResult.error.message
                        : testResult.error.message}
                    </div>
                  </>
                }
              />
            ) : (
              <Alert
                type="success"
                showIcon
                title={line?.item?.name}
                description={
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>{t("testPlu", { plu: line?.scale?.plu ?? line?.scale?.gtin ?? "" })}</span>
                    <span>{t("testQuantity", { quantity: Number(line?.scale?.quantity ?? 0), unit: line?.scale?.unit ?? "" })}</span>
                    {line?.scale?.embedded_price != null ? (
                      <span>
                        {t("testPrice", { price: Number(line.scale.embedded_price), currency: line.scale.embedded_currency ?? "" })}
                      </span>
                    ) : null}
                    {line?.scale?.lot_number ? <span>{t("testLot", { lot: line.scale.lot_number })}</span> : null}
                    {line?.scale?.expiry ? <span>{t("testExpiry", { date: line.scale.expiry })}</span> : null}
                    <Tag>{t(`type_${line?.scale?.value_type ?? "weight"}`)}</Tag>
                    {(line?.scale?.warnings ?? []).map((w) => (
                      <div key={w.code} className="w-full text-[var(--ant-color-warning)]">
                        {t(`warning_${w.code}`, w.params ?? {})}
                      </div>
                    ))}
                  </div>
                }
              />
            )}
          </div>
        ) : null}
      </section>
    </ResourceCrudDrawer>
  );
}
