"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantDateTime, formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import LookupSelectWithCreate from "@/shared/components/resource-drawer/LookupSelectWithCreate";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { fetchWarehouseNames } from "@/features/warehouses/api/warehouses.api";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses/queries/warehousesQueryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Checkbox, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  creditDocumentStatusTagColor,
  getCreditDocumentStatusLabel,
  isCreditDocumentDraft,
} from "../creditDocumentUtils";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   documentId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   fromInvoiceId?: string | null;
 *   config: Record<string, any>;
 * }} props
 */
export default function CreditDocumentDrawer({ open, mode, documentId, onClose, onCreated, fromInvoiceId = null, config }) {
  const t = useTranslations(config.i18n);
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess(config.resource);
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [lines, setLines] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyAmounts, setApplyAmounts] = useState(/** @type {Record<string, number | null>} */ ({}));
  const partyId = Form.useWatch(config.partyField, form);
  const invoiceId = Form.useWatch(config.invoiceField, form);
  const type = Form.useWatch("type", form) || "return";
  const linesRef = useRef(/** @type {Array<Record<string, unknown>>} */ ([]));
  const baselineRef = useRef("");
  const partyRef = useRef(/** @type {unknown} */ (undefined));

  const detailEnabled = open && documentId != null && (mode === "edit" || mode === "view");
  const detailQuery = useQuery({
    queryKey: [...config.detailPrefix, documentId],
    queryFn: () => config.api.fetch(/** @type {string} */ (documentId)),
    enabled: detailEnabled,
  });
  const record = detailEnabled ? detailQuery.data : null;
  const status = typeof record?.status === "string" ? record.status : mode === "create" ? "draft" : null;
  const readOnly = mode === "view" || (status != null && !isCreditDocumentDraft(status));
  const activeInvoiceId = invoiceId || record?.[config.invoiceField] || fromInvoiceId;

  const invoicesQuery = useQuery({
    queryKey: [...config.invoiceQueryKey, "credit-picker", partyId],
    queryFn: () => config.api.listInvoices({ [config.partyField]: partyId, status: "posted", per_page: 100 }),
    enabled: open && !readOnly && Boolean(partyId),
  });
  const invoiceOptions = (invoicesQuery.data?.rows ?? invoicesQuery.data?.data ?? []).map((row) => ({
    value: row.id,
    label: invoiceChoiceLabel(row),
  }));

  const seedQuery = useQuery({
    queryKey: [...config.invoiceDetailPrefix, "credit-seed", fromInvoiceId],
    queryFn: () => config.api.fetchInvoice(/** @type {string} */ (fromInvoiceId)),
    enabled: open && mode === "create" && Boolean(fromInvoiceId),
  });

  const linesQuery = useQuery({
    queryKey: [...config.detailPrefix, "invoice-lines", activeInvoiceId],
    queryFn: () => config.api.invoiceLines(/** @type {string} */ (activeInvoiceId)),
    enabled: open && Boolean(activeInvoiceId),
  });

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open && config.showRestock === true,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const snapshotOf = useCallback((nextLines) => {
    const values = form.getFieldsValue(true);
    const dateValue = values[config.dateField];
    return JSON.stringify({
      party: values[config.partyField] ?? null,
      invoice: values[config.invoiceField] ?? null,
      type: values.type ?? "return",
      date: dayjs.isDayjs(dateValue) ? dateValue.format("YYYY-MM-DD") : dateValue ? String(dateValue).slice(0, 10) : null,
      reason: values.reason ?? "",
      notes: values.notes ?? "",
      adjustment: Number(values.adjustment ?? 0),
      lines: nextLines.map((line) => [
        line.invoiceLineId,
        Number(line.returnQty ?? 0),
        Number(line.allowanceAmount ?? 0),
        Boolean(line.restock),
        line.warehouseId ?? null,
      ]),
    });
  }, [config.dateField, config.invoiceField, config.partyField, form]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    if (!open) {
      baselineRef.current = "";
      partyRef.current = undefined;
      return;
    }
    if (readOnly || fromInvoiceId || documentId) {
      partyRef.current = partyId;
      return;
    }
    if (partyRef.current !== undefined && partyRef.current !== partyId) {
      form.setFieldValue(config.invoiceField, undefined);
    }
    partyRef.current = partyId;
  }, [config.invoiceField, documentId, form, fromInvoiceId, open, partyId, readOnly]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create" && !record) {
      const seed = seedQuery.data;
      const wasClean = baselineRef.current === "" || baselineRef.current === snapshotOf(linesRef.current);
      form.setFieldsValue({
        [config.partyField]: seed?.[config.partyField],
        [config.invoiceField]: seed?.id ?? fromInvoiceId ?? undefined,
        type: "return",
        [config.dateField]: dayjs().format("YYYY-MM-DD"),
        reason: "",
        notes: "",
        adjustment: 0,
      });
      if (wasClean) baselineRef.current = snapshotOf(linesRef.current);
    }
  }, [config.dateField, config.invoiceField, config.partyField, form, fromInvoiceId, mode, open, record, seedQuery.data, snapshotOf]);

  useEffect(() => {
    if (!record?.id) return;
    const wasClean = baselineRef.current === "" || baselineRef.current === snapshotOf(linesRef.current);
    form.setFieldsValue({
      [config.partyField]: record[config.partyField],
      [config.invoiceField]: record[config.invoiceField],
      type: record.type,
      [config.dateField]: record[config.dateField] ? String(record[config.dateField]).slice(0, 10) : undefined,
      reason: record.reason ?? "",
      notes: record.notes ?? "",
      adjustment: record.adjustment != null ? Number(record.adjustment) : 0,
    });
    if (wasClean) baselineRef.current = snapshotOf(linesRef.current);
  }, [config.dateField, config.invoiceField, config.partyField, form, record, snapshotOf]);

  const lineSources = open && Array.isArray(linesQuery.data) ? linesQuery.data : NO_CREDIT_LINES;
  const savedLines = Array.isArray(record?.lines) ? record.lines : NO_CREDIT_LINES;
  const [loadedLines, setLoadedLines] = useState(
    /** @type {{ sources: unknown; saved: unknown; open: boolean }} */ ({ sources: null, saved: null, open: false }),
  );
  const [baselineRequest, setBaselineRequest] = useState(
    /** @type {{ before: string; next: string } | null} */ (null),
  );
  if (loadedLines.sources !== lineSources || loadedLines.saved !== savedLines || loadedLines.open !== open) {
    const nextLines = creditLinesFromInvoice(lineSources, savedLines, config.lineInvoiceField, record?.type);
    if (open) setBaselineRequest({ before: snapshotOf(lines), next: snapshotOf(nextLines) });
    setLoadedLines({ sources: lineSources, saved: savedLines, open });
    setLines(nextLines);
  }

  useEffect(() => {
    if (baselineRequest == null) return;
    if (baselineRef.current === "" || baselineRef.current === baselineRequest.before) {
      baselineRef.current = baselineRequest.next;
    }
  }, [baselineRequest]);

  const hasAmount = lines.some((line) => (type === "allowance" ? Number(line.allowanceAmount) > 0 : Number(line.returnQty) > 0));

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: config.queryKey });
    queryClient.invalidateQueries({ queryKey: config.detailPrefix });
    for (const key of config.extraQueryKeys ?? []) queryClient.invalidateQueries({ queryKey: key });
  }, [config.detailPrefix, config.extraQueryKeys, config.queryKey, queryClient]);

  const keepSavedOpen = useCallback((saved) => {
    const id = saved?.id == null ? null : String(saved.id);
    if (id) queryClient.setQueryData([...config.detailPrefix, id], saved);
    baselineRef.current = "";
    invalidate();
  }, [config.detailPrefix, invalidate, queryClient]);

  const linePayload = useCallback(() => {
    return lines
      .filter((line) => (type === "allowance" ? Number(line.allowanceAmount) > 0 : Number(line.returnQty) > 0))
      .map((line) => ({
        [config.lineInvoiceField]: line.invoiceLineId,
        quantity: type === "allowance" || line.allowReturn === false ? 0 : line.returnQty,
        line_total: type === "allowance" ? line.allowanceAmount : undefined,
        warehouse_id: line.warehouseId || null,
        ...(config.showRestock ? { restock: Boolean(line.restock) } : {}),
      }));
  }, [config.lineInvoiceField, config.showRestock, lines, type]);

  const saveMutation = useMutation({
    mutationFn: async ({ values, shouldPost }) => {
      const header = {
        type: values.type,
        [config.dateField]: dayjs.isDayjs(values[config.dateField]) ? values[config.dateField].format("YYYY-MM-DD") : String(values[config.dateField]).slice(0, 10),
        reason: String(values.reason ?? "").trim(),
        notes: values.notes ? String(values.notes) : null,
        adjustment: values.adjustment ?? 0,
      };
      let saved = record;
      if (!documentId || mode === "create") {
        saved = await config.api.create({
          ...header,
          [config.invoiceField]: values[config.invoiceField],
          lines: linePayload(),
        });
      } else {
        saved = await config.api.update(documentId, header);
        saved = await config.api.syncLines(documentId, { lines: linePayload() });
      }
      const id = String(saved.id);
      if (shouldPost) saved = await config.api.post(id);
      return saved;
    },
    onSuccess: (saved, vars) => {
      message.success(vars.shouldPost ? t("postSuccess") : t("saveSuccess"));
      keepSavedOpen(saved);
      if (mode === "create") onCreated?.(saved);
    },
    onError: (err) => {
      applyApiFieldErrors(form, err);
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: () => config.api.reverse(/** @type {string} */ (documentId)),
    onSuccess: (saved) => {
      message.success(t("reverseSuccess"));
      keepSavedOpen(saved);
    },
    onError: (err) => notification.error({ title: t("reverseError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const allocations = Object.entries(applyAmounts)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([id, amount]) => ({ [config.invoiceField]: id, amount }));
      return config.api.apply(/** @type {string} */ (documentId), { allocations });
    },
    onSuccess: () => {
      message.success(t("applySuccess"));
      setApplyOpen(false);
      invalidate();
      queryClient.invalidateQueries({ queryKey: [...config.detailPrefix, documentId] });
    },
    onError: (err) => notification.error({ title: t("applyError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });

  const submit = useCallback(
    (shouldPost) => {
      form.validateFields().then((values) => {
        const run = () => closeConfirmOnError(saveMutation.mutateAsync({ values, shouldPost }));
        if (!shouldPost) {
          run();
          return;
        }
        modal.confirm({ title: t("postConfirmTitle"), content: t("postConfirmContent"), okText: t("actionPost"), cancelText: t("drawerCancel"), onOk: run });
      }).catch(() => {});
    },
    [form, modal, saveMutation, t],
  );

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly || baselineRef.current === "") return false;
    return snapshotOf(lines) !== baselineRef.current;
  }, [lines, readOnly, snapshotOf]);

  const { requestClose, forceClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard,
  });
  useDrawerSubmitShortcut({ enabled: !readOnly, submitting: saveMutation.isPending, onSave: () => submit(false), saveDisabled: !access.canEdit && mode !== "create", onPost: () => submit(true), postDisabled: !hasAmount || !access.canEdit });

  const columns = useMemo(
    () => [
      { title: t("colItem"), dataIndex: "label", width: 220, ellipsis: true },
      { title: t("colInvoiced"), dataIndex: "invoiced", width: 110, align: "right", render: (value) => formatTenantNumber(value, { decimals: 6, trimTrailingZeros: true }) || "\u2014" },
      { title: t("colReturnable"), dataIndex: "returnable", width: 120, align: "right", render: (value) => formatTenantNumber(value, { decimals: 6, trimTrailingZeros: true }) || "\u2014" },
      { title: t("colCreditable"), dataIndex: "creditable", width: 130, align: "right", render: (value) => formatTenantMoney(value) || "\u2014" },
      {
        title: type === "allowance" ? t("colAllowance") : t("colReturnQty"),
        width: 140,
        render: (_, line) => (
          <TenantNumberInput
            kind={type === "allowance" ? "money" : "quantity"}
            disabled={readOnly || (type !== "allowance" && line.allowReturn === false)}
            value={type === "allowance" ? line.allowanceAmount : (line.allowReturn === false ? 0 : line.returnQty)}
            onChange={(value) => {
              setLines((prev) => prev.map((row) => (row.invoiceLineId === line.invoiceLineId
                ? { ...row, [type === "allowance" ? "allowanceAmount" : "returnQty"]: value }
                : row)));
            }}
          />
        ),
      },
      ...(config.showRestock && type === "return"
        ? [{
            title: t("colRestock"),
            width: 110,
            render: (_, line) => (
              <Checkbox
                disabled={readOnly || !line.trackInventory}
                checked={Boolean(line.restock)}
                onChange={(event) => setLines((prev) => prev.map((row) => (row.invoiceLineId === line.invoiceLineId ? { ...row, restock: event.target.checked } : row)))}
              />
            ),
          }, {
            title: t("colWarehouse"),
            width: 180,
            render: (_, line) => (
              <Select
                className="w-full"
                disabled={readOnly || !line.restock}
                value={line.warehouseId ?? undefined}
                options={(warehousesQuery.data ?? []).map((row) => ({ value: row.id, label: row.name }))}
                onChange={(value) => setLines((prev) => prev.map((row) => (row.invoiceLineId === line.invoiceLineId ? { ...row, warehouseId: value } : row)))}
              />
            ),
          }]
        : []),
    ],
    [config.showRestock, readOnly, t, type, warehousesQuery.data],
  );

  const title = mode === "create" ? t("drawerTitleCreate") : readOnly ? t("drawerTitleView") : t("drawerTitleEdit");
  const submitting = saveMutation.isPending || reverseMutation.isPending;

  return (
    <>
      <ResourceCrudDrawer
        title={title}
        open={open}
        requestClose={requestClose}
        submitting={submitting}
        showExpand={false}
        placement="top"
        size="100%"
        className="sales-invoice-crud-drawer"
        showDetailLoading={detailEnabled && detailQuery.isPending}
        detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
        detailError={detailQuery.error}
        tApiErrors={tApiErrors}
        headerExtra={status ? <Tag color={creditDocumentStatusTagColor(status)}>{getCreditDocumentStatusLabel(t, status)}</Tag> : null}
        footer={
          <div className="flex w-full min-w-0 items-center gap-3">
            <div className="sales-invoice-drawer-footer-posted">
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedBy")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">{postedByName(record?.posted_by) || "\u2014"}</span>
              </span>
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedOn")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">{formatTenantDateTime(record?.posted_at) || "\u2014"}</span>
              </span>
            </div>
            {readOnly ? <Button className="shrink-0" onClick={forceClose}>{t("drawerClose")}</Button> : null}
            {readOnly && status === "posted" && access.canReverse ? (
              <Button className="shrink-0" danger loading={reverseMutation.isPending} onClick={() => modal.confirm({ title: t("reverseConfirmTitle"), content: t("reverseConfirmContent"), okText: t("actionReverse"), okButtonProps: { danger: true }, cancelText: t("drawerCancel"), onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()) })}>
                {t("actionReverse")}
              </Button>
            ) : null}
            {readOnly && status === "posted" && Number(record?.open_credit) > 0 && access.canEdit ? (
              <Button className="shrink-0" type="primary" onClick={() => setApplyOpen(true)}>{t("actionApply")}</Button>
            ) : null}
            {!readOnly ? (
              <Space className="ms-auto shrink-0">
                <Button onClick={requestClose}>{t("drawerCancel")}</Button>
                <Button loading={submitting} disabled={!access.canAdd && mode === "create"} onClick={() => submit(false)}>{t("drawerSave")}</Button>
                <Button type="primary" loading={submitting} disabled={!hasAmount || !access.canEdit} onClick={() => submit(true)}>{t("actionPost")}</Button>
              </Space>
            ) : null}
          </div>
        }
      >
        <Form form={form} layout="vertical" disabled={readOnly} className="item-general-form sales-invoice-form">
          <div className="sales-invoice-header">
            <div className="sales-invoice-header-pane flex flex-col gap-2">
              <Row gutter={[12, 8]}>
                <Col xs={24} sm={12}>
                  <LookupSelectWithCreate
                    form={form}
                    name={config.partyField}
                    label={<ResourceDrawerFieldLabel text={t("fieldParty")} required />}
                    rules={[{ required: true, message: t("partyRequired") }]}
                    readOnly={readOnly || Boolean(fromInvoiceId) || Boolean(documentId)}
                    fetchPage={config.party.fetchPage}
                    queryKey={config.party.queryKey}
                    queryParams={config.party.selectorParams}
                    recentKind={config.party.recentKind}
                    placeholder={t("fieldPartyPlaceholder")}
                    recentLabel={t("selectorRecent")}
                    clearRecentLabel={t("selectorClearRecent")}
                    seedOptions={record?.[config.partyRelation]?.id ? [{ value: record[config.partyRelation].id, label: String(record[config.partyRelation].name ?? "") }] : seedQuery.data?.[config.partyRelation] ? [{ value: seedQuery.data[config.partyRelation].id, label: String(seedQuery.data[config.partyRelation].name ?? "") }] : []}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name={config.dateField} label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />} rules={[{ required: true, message: t("dateRequired") }]} getValueProps={(value) => ({ value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined })}>
                    <DatePicker className="w-full" format={dayjsDatePattern()} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[12, 8]}>
                <Col xs={24} sm={12}>
                  <Form.Item name={config.invoiceField} label={<ResourceDrawerFieldLabel text={t("fieldInvoice")} required />} rules={[{ required: true, message: t("invoiceRequired") }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={invoiceOptions.length ? invoiceOptions : record?.[config.invoiceRelation] ? [{ value: record[config.invoiceField], label: invoiceChoiceLabel(record[config.invoiceRelation]) }] : seedQuery.data ? [{ value: seedQuery.data.id, label: invoiceChoiceLabel(seedQuery.data) }] : []}
                      disabled={readOnly || Boolean(fromInvoiceId) || Boolean(documentId)}
                      placeholder={t("fieldInvoicePlaceholder")}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="type" label={<ResourceDrawerFieldLabel text={t("fieldType")} required />} rules={[{ required: true }]}>
                    <Select options={[{ value: "return", label: t("typeReturn") }, { value: "allowance", label: t("typeAllowance") }]} />
                  </Form.Item>
                </Col>
              </Row>
            </div>
            <div className="sales-invoice-header-pane">
              <div className="payment-document-side-fields credit-document-header-fields">
                <Form.Item name="reason" label={<ResourceDrawerFieldLabel text={t("fieldReason")} required />} rules={[{ required: true, message: t("reasonRequired") }]}>
                  <Input maxLength={255} />
                </Form.Item>
                <Form.Item name="notes" className="payment-document-notes-span" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} />}>
                  <Input.TextArea />
                </Form.Item>
                <Form.Item>
                  <div className="sales-invoice-exchange-rate-inline w-full">
                    <ResourceDrawerFieldLabel text={t("fieldAdjustment")} />
                    <div className="sales-invoice-exchange-rate-input">
                      <Form.Item name="adjustment" noStyle>
                        <TenantNumberInput kind="money" className="w-full" aria-label={t("fieldAdjustment")} />
                      </Form.Item>
                    </div>
                  </div>
                </Form.Item>
              </div>
            </div>
          </div>
          <div className="item-lines-panel">
            <Table
              size="small"
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: 1010 }}
              rowKey="invoiceLineId"
              dataSource={lines}
              columns={columns}
              locale={{ emptyText: t("linesEmpty") }}
            />
          </div>
          <div className="sales-invoice-totals">
            <Summary label={t("totalGrand")} value={formatTenantMoney(record?.grand_total)} />
            <Summary label={t("totalTax")} value={formatTenantMoney(record?.tax_total)} />
            <Summary label={t("colApplied")} value={formatTenantMoney(record?.applied_total)} />
            <Summary label={t("colRefunded")} value={formatTenantMoney(record?.refunded_total)} />
            <Summary label={t("colOpenCredit")} value={formatTenantMoney(record?.open_credit)} />
          </div>
        </Form>
      </ResourceCrudDrawer>
      <Modal
        title={t("actionApply")}
        open={applyOpen}
        onCancel={() => setApplyOpen(false)}
        onOk={() => applyMutation.mutate()}
        confirmLoading={applyMutation.isPending}
        okText={t("actionApply")}
      >
        {(record?.applicable_invoices ?? []).map((invoice) => (
          <div key={invoice.id} className="mb-2 flex items-center justify-between gap-3">
            <span>{invoice.invoice_number} · {t("colOpen")}: {formatTenantMoney(invoice.net_to_pay)}</span>
            <TenantNumberInput kind="money" value={applyAmounts[invoice.id]} onChange={(value) => setApplyAmounts((prev) => ({ ...prev, [invoice.id]: value }))} />
          </div>
        ))}
        {(record?.applicable_invoices ?? []).length === 0 ? <div>{t("applyEmpty")}</div> : null}
      </Modal>
    </>
  );
}

const NO_CREDIT_LINES = [];

/**
 * @param {{ invoice_number?: unknown; invoice_date?: unknown } | null | undefined} invoice
 * @returns {string}
 */
function invoiceChoiceLabel(invoice) {
  const number = invoice?.invoice_number == null ? "" : String(invoice.invoice_number);
  const date = formatTenantDate(invoice?.invoice_date);
  return date ? `${number} · ${date}` : number;
}

/**
 * @param {Array<Record<string, any>>} sources
 * @param {Array<Record<string, any>>} saved
 * @param {string} lineInvoiceField
 * @param {unknown} noteType
 */
function creditLinesFromInvoice(sources, saved, lineInvoiceField, noteType) {
  return sources.map((source) => {
    const match = saved.find((line) => String(line[lineInvoiceField]) === String(source[lineInvoiceField]));
    return {
      invoiceLineId: source[lineInvoiceField],
      label: source.item?.name || source.description || source.item?.item_code || String(source[lineInvoiceField]),
      invoiced: source.quantity,
      returnable: source.returnable_base_quantity,
      creditable: source.creditable_total,
      conversion: Number(source.conversion_factor || 1) || 1,
      warehouseId: match?.warehouse_id ?? source.warehouse_id ?? null,
      restock: match ? match.restock !== false : true,
      allowReturn: source.allow_return !== false,
      returnQty: source.allow_return === false ? 0 : (match ? Number(match.quantity || 0) : 0),
      allowanceAmount: match && noteType === "allowance" ? Number(match.line_total || 0) : 0,
      trackInventory: Boolean(source.track_inventory),
    };
  });
}

/**
 * @param {unknown} user
 * @returns {string | null}
 */
function postedByName(user) {
  if (!user || typeof user !== "object") return null;
  const name = "name" in user && typeof user.name === "string" ? user.name.trim() : "";
  return name || null;
}

function Summary({ label, value }) {
  return (
    <div className="sales-invoice-totals-pane">
      <div className="text-xs text-neutral-500">{label}</div>
      <div>{value || "\u2014"}</div>
    </div>
  );
}
