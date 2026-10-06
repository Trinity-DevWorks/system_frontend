"use client";

import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { dayjsDatePattern, formatTenantMoney } from "@/lib/tenant-format";
import {
  SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX,
  SALES_CREDIT_NOTES_QUERY_KEY,
  salesCreditNoteOpenInvoicesQueryKey,
  salesCreditNoteSourceLinesQueryKey,
} from "../../queries/salesCreditNotesQueryKeys";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "@/features/sales-invoices/queries/salesInvoicesQueryKeys";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { CUSTOMER_LEDGER_QUERY_KEY } from "@/features/customer-ledger/customerLedgerConfig";
import {
  createSalesCreditNote,
  deleteSalesCreditNote,
  fetchSalesCreditNote,
  fetchSalesCreditNoteOpenInvoices,
  fetchSalesCreditNoteSourceLines,
  postSalesCreditNote,
  reverseSalesCreditNote,
  syncSalesCreditNoteLines,
  updateSalesCreditNote,
} from "../../api/salesCreditNotes.api";
import { getSalesCreditNoteStatusLabel, isSalesCreditNoteDraft } from "../../utils/salesCreditNoteStatuses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Form, Input, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCompanySettings, tenantPricesIncludeTax } from "@/lib/company-settings";
import { previewLineAmounts } from "@/features/sales-invoices/utils/salesInvoiceTax";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   creditNoteId: string | null;
 *   fromInvoiceId?: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function SalesCreditNoteDrawer({
  open,
  mode,
  creditNoteId,
  fromInvoiceId = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("SalesCreditNotes");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("sales_credit_notes");
  const { openDrawer } = useGlobalDrawer();
  const [form] = Form.useForm();
  const [lineQty, setLineQty] = useState(/** @type {Record<string, number | string>} */ ({}));
  const [submitting, setSubmitting] = useState(false);
  const lastInvoiceRef = useRef(/** @type {string | null} */ (null));
  const { settings } = useCompanySettings();
  const pricesIncludeTax = tenantPricesIncludeTax(settings);

  const detailEnabled = open && (mode === "edit" || mode === "view") && creditNoteId != null;
  const detailQuery = useQuery({
    queryKey: [...SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX, creditNoteId],
    queryFn: () => fetchSalesCreditNote(/** @type {string} */ (creditNoteId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const record = detailQuery.data && typeof detailQuery.data === "object" ? detailQuery.data : null;
  const status = typeof record?.status === "string" ? record.status : mode === "create" ? "draft" : null;
  const readOnly = mode === "view" || !isSalesCreditNoteDraft(status);

  const invoiceIdWatch = Form.useWatch("sales_invoice_id", form);
  const selectedInvoiceId =
    normalizeEntityId(invoiceIdWatch) ??
    normalizeEntityId(record?.sales_invoice_id) ??
    (mode === "create" ? normalizeEntityId(fromInvoiceId) : null);

  const openInvoicesQuery = useQuery({
    queryKey: salesCreditNoteOpenInvoicesQueryKey(null),
    queryFn: () => fetchSalesCreditNoteOpenInvoices(),
    enabled: open && mode === "create",
    staleTime: QUERY_STALE_TIME.default,
  });

  const sourceQuery = useQuery({
    queryKey: salesCreditNoteSourceLinesQueryKey(selectedInvoiceId),
    queryFn: () => fetchSalesCreditNoteSourceLines(/** @type {string} */ (selectedInvoiceId)),
    enabled: open && selectedInvoiceId != null && isSalesCreditNoteDraft(status),
    staleTime: QUERY_STALE_TIME.default,
  });

  useEffect(() => {
    if (!open) {
      lastInvoiceRef.current = null;
      setLineQty({});
      return;
    }
    if (mode === "create") {
      form.setFieldsValue({
        sales_invoice_id: fromInvoiceId || undefined,
        credit_date: dayjs(),
        notes: undefined,
      });
      const invoiceId = selectedInvoiceId ?? null;
      if (lastInvoiceRef.current !== invoiceId) {
        lastInvoiceRef.current = invoiceId;
        setLineQty({});
      }
      return;
    }
    if (!record) return;
    form.setFieldsValue({
      sales_invoice_id: record.sales_invoice_id,
      credit_date: record.credit_date ? dayjs(record.credit_date) : null,
      notes: record.notes,
    });
    const next = {};
    for (const line of Array.isArray(record.lines) ? record.lines : []) {
      if (line?.sales_invoice_line_id != null) {
        next[String(line.sales_invoice_line_id)] = line.quantity;
      }
    }
    setLineQty(next);
  }, [open, mode, record, fromInvoiceId, selectedInvoiceId, form]);

  useEffect(() => {
    if (!open || !isSalesCreditNoteDraft(status) || creditNoteId != null) return;
    const rows = sourceQuery.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    setLineQty((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of rows) {
        const key = String(row.sales_invoice_line_id);
        if (!Object.prototype.hasOwnProperty.call(next, key)) {
          next[key] = row.suggested_quantity ?? row.remaining_quantity;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [open, status, creditNoteId, sourceQuery.data]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SALES_CREDIT_NOTES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SALES_INVOICE_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CUSTOMER_LEDGER_QUERY_KEY });
  }, [queryClient]);

  const lineRows = useMemo(() => {
    if (readOnly && Array.isArray(record?.lines)) {
      return record.lines.map((line) => ({
        sales_invoice_line_id: line.sales_invoice_line_id,
        item_code: line.item?.item_code,
        item_name: line.item?.name,
        remaining_quantity: line.quantity,
        unit_price: line.unit_price,
        quantity: line.quantity,
        line_total: line.line_total,
      }));
    }
    return Array.isArray(sourceQuery.data) ? sourceQuery.data : [];
  }, [readOnly, record, sourceQuery.data]);

  const liveGrand = useMemo(() => {
    if (readOnly) return record?.grand_total ?? null;
    let sum = 0;
    for (const row of lineRows) {
      const qty = lineQty[String(row.sales_invoice_line_id)] ?? 0;
      const live = previewLineAmounts({
        row: {
          quantity: qty,
          unit_price: row.unit_price,
          discount_percent: row.discount_percent ?? 0,
        },
        taxRate: Number(row.tax_rate ?? 0),
        pricesIncludeTax,
        settings,
      });
      sum += Number(live?.line_total ?? 0);
    }
    return sum;
  }, [readOnly, record, lineRows, lineQty, pricesIncludeTax, settings]);

  const selectedLines = useCallback(() => {
    return lineRows
      .map((row) => {
        const qty = Number(lineQty[String(row.sales_invoice_line_id)] ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        return {
          sales_invoice_line_id: row.sales_invoice_line_id,
          quantity: qty,
        };
      })
      .filter(Boolean);
  }, [lineRows, lineQty]);

  const persist = useCallback(
    async (postAfter) => {
      const values = await form.validateFields();
      const lines = selectedLines();
      if (lines.length === 0) {
        notification.error({ title: t("saveError"), description: t("linesRequired") });
        return;
      }
      setSubmitting(true);
      try {
        let id = creditNoteId;
        if (id == null) {
          const created = await createSalesCreditNote({
            sales_invoice_id: values.sales_invoice_id,
            credit_date: values.credit_date?.format?.("YYYY-MM-DD") ?? values.credit_date,
            notes: values.notes ?? null,
            lines,
          });
          id = normalizeEntityId(created?.id);
          if (id == null) throw new Error("missing id");
          onCreated?.(created);
          message.success(t("createSuccess"));
        } else {
          await updateSalesCreditNote(id, {
            credit_date: values.credit_date?.format?.("YYYY-MM-DD") ?? values.credit_date,
            notes: values.notes ?? null,
          });
          await syncSalesCreditNoteLines(id, { lines });
          message.success(t("updateSuccess"));
        }
        if (postAfter && id != null) {
          await postSalesCreditNote(id);
          message.success(t("postSuccess"));
          invalidateAll();
          onClose();
          return;
        }
        invalidateAll();
        if (mode === "create" && id != null) {
          openDrawer({
            featureId: "salesCreditNotes",
            id,
            mode: "edit",
          });
        }
      } catch (err) {
        notification.error({
          title: postAfter ? t("postError") : t("saveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [form, selectedLines, creditNoteId, onCreated, onClose, openDrawer, invalidateAll, mode, message, notification, t, tApiErrors],
  );

  const handleDelete = useCallback(() => {
    if (creditNoteId == null) return;
    modal.confirm({
      title: t("deleteConfirmTitle"),
      content: t("deleteConfirmContent", { name: record?.credit_note_number || creditNoteId }),
      okText: t("deleteConfirmOk"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () =>
        closeConfirmOnError(
          deleteSalesCreditNote(creditNoteId).then(() => {
            message.success(t("deleteSuccess"));
            invalidateAll();
            onClose();
          }),
        ),
    });
  }, [creditNoteId, record, modal, t, message, invalidateAll, onClose]);

  const handleReverse = useCallback(() => {
    if (creditNoteId == null) return;
    modal.confirm({
      title: t("reverseConfirmTitle"),
      content: t("reverseConfirmContent"),
      okText: t("actionReverse"),
      okButtonProps: { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () =>
        closeConfirmOnError(
          reverseSalesCreditNote(creditNoteId).then(() => {
            message.success(t("reverseSuccess"));
            invalidateAll();
            onClose();
          }),
        ),
    });
  }, [creditNoteId, modal, t, message, invalidateAll, onClose]);

  const invoiceOptions = useMemo(() => {
    const rows = Array.isArray(openInvoicesQuery.data) ? openInvoicesQuery.data : [];
    const current = record?.sales_invoice;
    const options = rows.map((row) => ({
      value: String(row.id),
      label: `${row.invoice_number} · ${formatTenantMoney(row.net_to_pay)}`,
    }));
    if (current?.id && !options.some((o) => o.value === String(current.id))) {
      options.unshift({
        value: String(current.id),
        label: current.invoice_number || String(current.id),
      });
    }
    return options;
  }, [openInvoicesQuery.data, record]);

  const title =
    mode === "create"
      ? t("drawerTitleCreate")
      : `${mode === "view" || readOnly ? t("drawerTitleView") : t("drawerTitleEdit")}${
          record?.credit_note_number ? ` # ${record.credit_note_number}` : ""
        }`;

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={onClose}
      submitting={submitting}
      showExpand={false}
      size={720}
      headerExtra={
        status ? (
          <Tag>{getSalesCreditNoteStatusLabel(t, status)}</Tag>
        ) : null
      }
      showDetailLoading={Boolean(detailEnabled && detailQuery.isLoading)}
      detailLoadFailed={Boolean(detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        readOnly ? (
          <div className="flex w-full items-center gap-3">
            <Button onClick={onClose}>{t("drawerClose")}</Button>
            <Space className="ms-auto">
              {status === "posted" && access.canReverse && record?.can_reverse !== false ? (
                <Button danger loading={submitting} onClick={handleReverse}>
                  {t("actionReverse")}
                </Button>
              ) : null}
            </Space>
          </div>
        ) : (
          <div className="flex w-full items-center gap-3">
            {creditNoteId != null && access.canDelete ? (
              <Button danger disabled={submitting} onClick={handleDelete}>
                {t("actionDelete")}
              </Button>
            ) : null}
            <Space className="ms-auto">
              <Button onClick={onClose} disabled={submitting}>
                {t("drawerCancel")}
              </Button>
              <Button disabled={submitting} loading={submitting} onClick={() => persist(false)}>
                {t("drawerSave")}
              </Button>
              {access.canEdit ? (
                <Button type="primary" disabled={submitting} loading={submitting} onClick={() => persist(true)}>
                  {t("actionPost")}
                </Button>
              ) : null}
            </Space>
          </div>
        )
      }
    >
      <Form form={form} layout="vertical" disabled={readOnly || submitting}>
        <Form.Item
          name="sales_invoice_id"
          label={<ResourceDrawerFieldLabel text={t("fieldInvoice")} required />}
          rules={[{ required: true, message: t("invoiceRequired") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={readOnly || creditNoteId != null}
            options={invoiceOptions}
            placeholder={t("fieldInvoicePlaceholder")}
          />
        </Form.Item>
        {record?.sales_invoice?.invoice_number ? (
          <Button
            type="link"
            className="mb-3 !px-0"
            onClick={() => {
              const id = normalizeEntityId(record.sales_invoice_id);
              if (id == null) return;
              openDrawer({ featureId: "salesInvoices", id, mode: "view", seed: record.sales_invoice });
            }}
          >
            {t("openInvoice")}
          </Button>
        ) : null}
        <Form.Item name="credit_date" label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}>
          <DatePicker className="w-full" format={dayjsDatePattern()} />
        </Form.Item>
        <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} optional />}>
          <Input.TextArea rows={2} maxLength={5000} />
        </Form.Item>
      </Form>
      <Table
        size="small"
        rowKey={(row) => String(row.sales_invoice_line_id)}
        pagination={false}
        dataSource={lineRows}
        columns={[
          { title: t("colItem"), key: "item", render: (_, row) => `${row.item_code ?? ""} ${row.item_name ?? ""}`.trim() || "—" },
          {
            title: t("colRemaining"),
            key: "remaining",
            align: "right",
            render: (_, row) => {
              const available = Number(row.remaining_quantity ?? 0);
              if (readOnly) return row.remaining_quantity ?? "—";
              const qty = Number(lineQty[String(row.sales_invoice_line_id)] ?? 0);
              const leftover = available - (Number.isFinite(qty) ? qty : 0);
              return leftover > 0 ? leftover : 0;
            },
          },
          {
            title: t("colQuantity"),
            key: "qty",
            width: 140,
            render: (_, row) =>
              readOnly ? (
                row.quantity
              ) : (
                <TenantNumberInput
                  kind="quantity"
                  min={0}
                  max={Number(row.remaining_quantity) || undefined}
                  value={lineQty[String(row.sales_invoice_line_id)]}
                  onChange={(value) =>
                    setLineQty((prev) => ({
                      ...prev,
                      [String(row.sales_invoice_line_id)]: value ?? 0,
                    }))
                  }
                />
              ),
          },
          {
            title: t("colLineTotal"),
            key: "total",
            align: "right",
            render: (_, row) => {
              if (readOnly) return formatTenantMoney(row.line_total) || "—";
              const qty = lineQty[String(row.sales_invoice_line_id)] ?? 0;
              const live = previewLineAmounts({
                row: {
                  quantity: qty,
                  unit_price: row.unit_price,
                  discount_percent: row.discount_percent ?? 0,
                },
                taxRate: Number(row.tax_rate ?? 0),
                pricesIncludeTax,
                settings,
              });
              return formatTenantMoney(live?.line_total ?? 0) || "—";
            },
          },
        ]}
      />
      {liveGrand != null ? (
        <div className="mt-3 text-end text-sm">
          <span className="text-[var(--ant-color-text-tertiary)]">{t("totalGrand")}</span>{" "}
          <strong>{formatTenantMoney(liveGrand)}</strong>
        </div>
      ) : null}
    </ResourceCrudDrawer>
  );
}
