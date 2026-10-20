"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { normalizeEntityId } from "@/lib/entityId";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDateTime, formatTenantMoney, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Col, ConfigProvider, DatePicker, Form, Input, Row, Select, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { accountDisplayName } from "../accountingUtils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createJournalEntry,
  deleteJournalEntry,
  fetchJournalEntry,
  postJournalEntry,
  replaceJournalEntryLines,
  reverseJournalEntry,
  updateJournalEntry,
} from "../api/accounting.api";
import {
  SOURCE_DOCUMENT_FEATURE,
  amountUnits,
  journalStatusTagColor,
  unitsToAmount,
} from "../accountingUtils";
import { ACCOUNTS_QUERY_KEY, JOURNAL_ENTRIES_QUERY_KEY, JOURNAL_ENTRY_DETAIL_QUERY_PREFIX } from "../queries/accountingQueryKeys";
import { usePostableAccounts } from "../queries/usePostableAccounts";

const CONTROLLED_ROLES = new Set(["receivable", "payable", "inventory", "vat_output", "vat_input"]);

/**
 * @typedef {{
 *   key: string;
 *   account_id?: number;
 *   description: string;
 *   debit: number | null;
 *   credit: number | null;
 *   account_code?: string | null;
 *   account_name?: string | null;
 *   account_name_ar?: string | null;
 *   currency_code?: string | null;
 *   amount_currency?: string | null;
 *   party_name?: string | null;
 * }} EntryLine
 */

let lineSeq = 0;
/** @returns {EntryLine} */
function blankLine() {
  lineSeq += 1;
  return { key: `new-${lineSeq}`, description: "", debit: null, credit: null };
}

/**
 * @param {Record<string, unknown>} line
 * @returns {EntryLine}
 */
function lineFromRecord(line) {
  const debit = Number(line.debit ?? 0);
  const credit = Number(line.credit ?? 0);
  return {
    key: String(line.id),
    account_id: Number(line.account_id),
    description: String(line.description ?? ""),
    debit: debit > 0 ? debit : null,
    credit: credit > 0 ? credit : null,
    account_code: /** @type {string | null} */ (line.account_code ?? null),
    account_name: /** @type {string | null} */ (line.account_name ?? null),
    account_name_ar: /** @type {string | null} */ (line.account_name_ar ?? null),
    currency_code: /** @type {string | null} */ (line.currency_code ?? null),
    amount_currency: /** @type {string | null} */ (line.amount_currency ?? null),
    party_name: /** @type {string | null} */ (line.party_name ?? null),
  };
}

/** @param {EntryLine[]} lines */
function linesPayload(lines) {
  return lines
    .filter((line) => line.account_id != null)
    .map((line) => ({
      account_id: line.account_id,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
      description: line.description.trim() === "" ? null : line.description.trim(),
    }));
}

/** @param {unknown} value */
function toIsoDate(value) {
  if (!value) return dayjs().format("YYYY-MM-DD");
  if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
  return String(value).slice(0, 10);
}

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   entryId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function JournalEntryDrawer({ open, mode, entryId, onClose, onCreated }) {
  const t = useTranslations("Accounting");
  const locale = useLocale();
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess("journal_entries");
  const queryClient = useQueryClient();
  const { openDrawer } = useGlobalDrawer();
  const [form] = Form.useForm();
  const [lines, setLines] = useState(/** @type {EntryLine[]} */ ([]));
  const baselineRef = useRef("");
  const sessionRef = useRef("");

  const detailEnabled = open && entryId != null && mode !== "create";
  const detailQuery = useQuery({
    queryKey: [...JOURNAL_ENTRY_DETAIL_QUERY_PREFIX, entryId],
    queryFn: () => fetchJournalEntry(/** @type {string} */ (entryId)),
    enabled: detailEnabled,
  });
  const record = detailEnabled ? detailQuery.data : null;
  const status = typeof record?.status === "string" ? record.status : "draft";
  const isManual = mode === "create" || Boolean(record?.is_manual);
  const readOnly = mode === "view" || status !== "draft" || !isManual;

  const manualAccountFilter = useCallback(
    (account) => !(account.roles ?? []).some((role) => CONTROLLED_ROLES.has(role)),
    [],
  );
  const { options: accountOptions, isPending: accountsPending } = usePostableAccounts({
    enabled: open && !readOnly,
    filter: manualAccountFilter,
  });

  const snapshotOf = useCallback(
    (nextLines) => {
      const values = form.getFieldsValue(true);
      return JSON.stringify({
        entry_date: toIsoDate(values.entry_date),
        description: String(values.description ?? ""),
        lines: linesPayload(nextLines),
      });
    },
    [form],
  );

  const applyRecord = useCallback(
    (next) => {
      const nextLines = Array.isArray(next.lines) ? next.lines.map(lineFromRecord) : [];
      form.setFieldsValue({
        entry_date: next.entry_date ? String(next.entry_date).slice(0, 10) : dayjs().format("YYYY-MM-DD"),
        description: String(next.description ?? ""),
      });
      setLines(nextLines);
      baselineRef.current = snapshotOf(nextLines);
    },
    [form, snapshotOf],
  );

  useEffect(() => {
    if (!open) {
      sessionRef.current = "";
      return;
    }
    if (mode === "create") {
      if (sessionRef.current === "create") return;
      sessionRef.current = "create";
      const initial = [blankLine(), blankLine()];
      form.setFieldsValue({ entry_date: dayjs().format("YYYY-MM-DD"), description: "" });
      setLines(initial);
      baselineRef.current = snapshotOf(initial);
      return;
    }
    if (!record?.id) return;
    const key = `${record.id}:${detailQuery.dataUpdatedAt}`;
    if (sessionRef.current === key) return;
    sessionRef.current = key;
    applyRecord(record);
  }, [applyRecord, detailQuery.dataUpdatedAt, form, mode, open, record, snapshotOf]);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + amountUnits(line.debit), 0);
    const credit = lines.reduce((sum, line) => sum + amountUnits(line.credit), 0);
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  const filledLines = lines.filter((line) => line.account_id != null);
  const linesValid =
    filledLines.length >= 2 &&
    filledLines.every((line) => (amountUnits(line.debit) > 0) !== (amountUnits(line.credit) > 0));
  const canPost = access.canEdit && linesValid && totals.difference === 0 && totals.debit > 0;

  const updateLine = useCallback((key, patch) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: JOURNAL_ENTRIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
  }, [queryClient]);

  const persist = useCallback(
    async (/** @type {Record<string, unknown>} */ values, /** @type {boolean} */ shouldPost) => {
      const header = {
        entry_date: toIsoDate(values.entry_date),
        description: String(values.description ?? "").trim() || null,
      };
      const payloadLines = linesPayload(lines);
      let id = entryId == null ? null : normalizeEntityId(entryId);
      /** @type {Record<string, unknown>} */
      let saved;
      if (id == null || mode === "create") {
        saved = await createJournalEntry({ ...header, lines: payloadLines });
        id = normalizeEntityId(saved?.id);
      } else {
        await updateJournalEntry(id, header);
        saved = await replaceJournalEntryLines(id, payloadLines);
      }
      if (id == null) throw new Error("Missing journal entry id");
      if (shouldPost) {
        try {
          saved = await postJournalEntry(id);
        } catch (error) {
          invalidate();
          if (mode === "create") onCreated?.(saved);
          throw error;
        }
      }
      invalidate();
      queryClient.setQueryData([...JOURNAL_ENTRY_DETAIL_QUERY_PREFIX, id], saved);
      return saved;
    },
    [entryId, invalidate, lines, mode, onCreated, queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: (/** @type {{ values: Record<string, unknown>; shouldPost: boolean }} */ args) =>
      persist(args.values, args.shouldPost),
    onSuccess: (saved, args) => {
      message.success(args.shouldPost ? t("entryPostSuccess") : mode === "create" ? t("entryCreateSuccess") : t("entryUpdateSuccess"));
      if (mode === "create") onCreated?.(saved);
      else applyRecord(saved);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
      }
    },
  });

  const reverseMutation = useMutation({
    mutationFn: () => reverseJournalEntry(/** @type {string} */ (entryId)),
    onSuccess: (reversal) => {
      message.success(t("entryReverseSuccess"));
      invalidate();
      queryClient.invalidateQueries({ queryKey: JOURNAL_ENTRY_DETAIL_QUERY_PREFIX });
      const id = normalizeEntityId(reversal?.id);
      if (id != null) openDrawer({ featureId: "journalEntries", id, mode: "view" });
    },
    onError: (err) => {
      notification.error({ title: t("entryReverseError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJournalEntry(/** @type {string} */ (entryId)),
    onSuccess: () => {
      message.success(t("entryDeleteSuccess"));
      invalidate();
      onClose();
    },
    onError: (err) => {
      notification.error({ title: t("entryDeleteError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const submitting = saveMutation.isPending || reverseMutation.isPending || deleteMutation.isPending;

  const runSave = useCallback(
    (/** @type {boolean} */ shouldPost) => {
      form
        .validateFields()
        .then((values) => saveMutation.mutate({ values, shouldPost }))
        .catch(() => {});
    },
    [form, saveMutation],
  );

  const shouldConfirmDiscard = useCallback(
    () => !readOnly && baselineRef.current !== "" && snapshotOf(lines) !== baselineRef.current,
    [lines, readOnly, snapshotOf],
  );
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose, shouldConfirmDiscard });

  useDrawerSubmitShortcut({
    enabled: open && !readOnly,
    submitting,
    onSave: () => runSave(false),
    saveDisabled: submitting,
    onPost: () => runSave(true),
    postDisabled: !canPost || submitting,
  });

  const openRelated = (id) => {
    if (id) openDrawer({ featureId: "journalEntries", id: String(id), mode: "view" });
  };
  const sourceFeature = SOURCE_DOCUMENT_FEATURE[String(record?.source_type ?? "")];

  const lineColumns = useMemo(() => {
    /** @type {{ key: string; label: string; width: string }[]} */
    const cols = [
      { key: "account", label: t("colAccount"), width: "minmax(220px, 1.6fr)" },
      { key: "description", label: t("colDescription"), width: "minmax(160px, 1fr)" },
    ];
    if (readOnly) {
      cols.push(
        { key: "party", label: t("colParty"), width: "minmax(120px, 0.7fr)" },
        { key: "amount_currency", label: t("colAmountCurrency"), width: "170px" },
      );
    }
    cols.push(
      { key: "debit", label: t("colDebit"), width: "180px" },
      { key: "credit", label: t("colCredit"), width: "180px" },
    );
    return cols;
  }, [readOnly, t]);

  const renderLineField = (line, _index, columnKey) => {
    const row = /** @type {EntryLine} */ (line);
    if (columnKey === "account") {
      if (readOnly) {
        return (
          <span className="item-lines-readonly-uom">
            <span className="tabular-nums">{row.account_code}</span>
            <span className="ms-1">{accountDisplayName({ name: row.account_name, name_ar: row.account_name_ar }, locale)}</span>
          </span>
        );
      }
      return (
        <Select
          className="w-full"
          showSearch
          optionFilterProp="label"
          options={accountOptions}
          loading={accountsPending}
          value={row.account_id}
          placeholder={t("fieldAccountPlaceholder")}
          getPopupContainer={drawerSelectGetPopup}
          onChange={(value) => updateLine(row.key, { account_id: value == null ? undefined : Number(value) })}
        />
      );
    }
    if (columnKey === "description") {
      if (readOnly) {
        return <span className="item-lines-readonly-uom">{row.description || "\u2014"}</span>;
      }
      return (
        <Input
          value={row.description}
          maxLength={500}
          onChange={(event) => updateLine(row.key, { description: event.target.value })}
        />
      );
    }
    if (columnKey === "party") {
      return <span className="item-lines-readonly-uom">{row.party_name || "\u2014"}</span>;
    }
    if (columnKey === "amount_currency") {
      return (
        <span className="item-lines-readonly-uom justify-end tabular-nums">
          {row.currency_code ? `${formatTenantMoney(row.amount_currency)} ${row.currency_code}` : "\u2014"}
        </span>
      );
    }
    if (columnKey === "debit" || columnKey === "credit") {
      const amount = columnKey === "debit" ? row.debit : row.credit;
      if (readOnly) {
        return (
          <span className="item-lines-readonly-uom justify-end tabular-nums">
            {amount ? formatTenantMoneyWithSymbol(amount, currencySymbol) : ""}
          </span>
        );
      }
      return (
        <TenantNumberInput
          kind="money"
          className="w-full"
          min={0}
          addonAfter={currencySymbol || undefined}
          value={amount}
          onChange={(value) =>
            updateLine(row.key, {
              [columnKey]: value == null ? null : Number(value),
              ...(Number(value) > 0 ? { [columnKey === "debit" ? "credit" : "debit"]: null } : {}),
            })
          }
        />
      );
    }
    return null;
  };

  const number = record?.entry_number;
  const titleBase = mode === "create" ? t("entryDrawerCreate") : readOnly ? t("entryDrawerView") : t("entryDrawerEdit");

  return (
    <ResourceCrudDrawer
      title={number ? `${titleBase} # ${number}` : titleBase}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showExpand={false}
      placement="top"
      size="100%"
      className="sales-invoice-crud-drawer"
      headerExtra={
        <Tag className="m-0" color={journalStatusTagColor(status)}>
          {t(`status_${status}`)}
        </Tag>
      }
      showDetailLoading={detailEnabled && detailQuery.isLoading}
      detailLoadFailed={detailEnabled && detailQuery.isError}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        readOnly ? (
          <div className="flex w-full min-w-0 items-center gap-3">
            <div className="sales-invoice-drawer-footer-posted">
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedBy")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">{record?.posted_by_name || "\u2014"}</span>
              </span>
              <span className="sales-invoice-drawer-footer-posted-item">
                <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedOn")}</span>
                <span className="sales-invoice-drawer-footer-posted-value">
                  {formatTenantDateTime(/** @type {string} */ (record?.posted_at)) || "\u2014"}
                </span>
              </span>
            </div>
            <Button className="ms-auto" onClick={forceClose}>
              {t("drawerClose")}
            </Button>
            {status === "posted" && isManual && access.canReverse ? (
              <Button
                danger
                loading={submitting}
                onClick={() =>
                  modal.confirm({
                    title: t("entryReverseConfirmTitle"),
                    content: t("entryReverseConfirmContent"),
                    okText: t("actionReverse"),
                    okButtonProps: { danger: true },
                    cancelText: t("drawerCancel"),
                    onOk: () => closeConfirmOnError(reverseMutation.mutateAsync()),
                  })
                }
              >
                {t("actionReverse")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex w-full min-w-0 items-center gap-3">
            {entryId != null && mode !== "create" && access.canDelete ? (
              <Button
                danger
                disabled={submitting}
                onClick={() =>
                  modal.confirm({
                    title: t("entryDeleteConfirmTitle"),
                    content: t("entryDeleteConfirmContent", { name: String(number ?? entryId) }),
                    okText: t("actionDelete"),
                    okButtonProps: { danger: true },
                    cancelText: t("drawerCancel"),
                    onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
                  })
                }
              >
                {t("actionDelete")}
              </Button>
            ) : null}
            <Space className="ms-auto">
              <Button onClick={requestClose} disabled={submitting}>
                {t("drawerCancel")}
              </Button>
              <Button disabled={submitting} loading={saveMutation.isPending} onClick={() => runSave(false)}>
                {t("drawerSave")}
              </Button>
              <Button type="primary" disabled={!canPost || submitting} loading={saveMutation.isPending} onClick={() => runSave(true)}>
                {t("actionPost")}
              </Button>
            </Space>
          </div>
        )
      }
    >
      <div className="sales-invoice-keyboard-root">
        <Form form={form} layout="vertical" requiredMark={false} className="item-general-form sales-invoice-form" disabled={readOnly || submitting}>
          <div className="sales-invoice-header">
            <div className="sales-invoice-header-pane">
              <Row gutter={[12, 8]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="entry_date"
                    label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
                    rules={[{ required: true, message: t("fieldDateRequired") }]}
                    getValueProps={(value) => ({ value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined })}
                  >
                    <DatePicker className="w-full" format={dayjsDatePattern()} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="description" label={<ResourceDrawerFieldLabel text={t("fieldDescription")} optional />}>
                    <Input maxLength={500} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label={<ResourceDrawerFieldLabel text={t("colSource")} />}>
                    {sourceFeature && record?.source_id ? (
                      <ConfigProvider componentDisabled={false}>
                        <Button
                          className="flex h-8 w-full items-center justify-start px-3 font-normal"
                          onClick={() => openDrawer({ featureId: sourceFeature, id: String(record.source_id), mode: "view" })}
                        >
                          {t(`source_${record.source_type}`)}
                          {record.source_event === "reverse" ? ` (${t("eventReverse")})` : ""} {record.source_number ?? ""}
                        </Button>
                      </ConfigProvider>
                    ) : (
                      <Input
                        readOnly
                        value={
                          record && !isManual
                            ? `${t(`source_${record.source_type}`)}${record.source_event === "reverse" ? ` (${t("eventReverse")})` : ""}${record.source_number ? ` ${record.source_number}` : ""}`
                            : t("source_manual")
                        }
                      />
                    )}
                  </Form.Item>
                </Col>
              </Row>
              {record?.reversal_of_id || record?.reversal_id ? (
                <ConfigProvider componentDisabled={false}>
                  <div className="mt-2 text-sm">
                    {record.reversal_of_id ? (
                      <span>
                        {t("reversalOf")}{" "}
                        <Typography.Link onClick={() => openRelated(record.reversal_of_id)}>{record.reversal_of_number ?? ""}</Typography.Link>
                      </span>
                    ) : (
                      <span>
                        {t("reversedBy")}{" "}
                        <Typography.Link onClick={() => openRelated(record.reversal_id)}>{record.reversal_number ?? ""}</Typography.Link>
                      </span>
                    )}
                  </div>
                </ConfigProvider>
              ) : null}
            </div>
          </div>

          <section className="item-lines-panel">
            <LinesGrid
              columns={lineColumns}
              lines={lines}
              canAddLine={!readOnly}
              onAddLine={() => setLines((prev) => [...prev, blankLine()])}
              addLabel={t("actionAddLine")}
              deleteAriaLabel={t("actionRemoveLine")}
              onRemoveLine={(index) => setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
              showDeleteColumn={!readOnly}
              renderField={renderLineField}
              readOnly={readOnly}
            />
          </section>

          <section className="sales-invoice-totals">
            <div className="sales-invoice-totals-pane ms-auto w-full max-w-md">
              <div className="resource-drawer-pricing-summary">
                <div className="resource-drawer-pricing-card">
                  <span className="resource-drawer-pricing-card-label">{t("colDebit")}</span>
                  <span className="resource-drawer-pricing-card-value tabular-nums">
                    {formatTenantMoneyWithSymbol(unitsToAmount(totals.debit), currencySymbol)}
                  </span>
                </div>
                <div className="resource-drawer-pricing-card">
                  <span className="resource-drawer-pricing-card-label">{t("colCredit")}</span>
                  <span className="resource-drawer-pricing-card-value tabular-nums">
                    {formatTenantMoneyWithSymbol(unitsToAmount(totals.credit), currencySymbol)}
                  </span>
                </div>
                <div className="resource-drawer-pricing-card col-span-2">
                  <span className="resource-drawer-pricing-card-label">{t("difference")}</span>
                  <Typography.Text type={totals.difference === 0 ? undefined : "danger"} className="resource-drawer-pricing-card-value tabular-nums">
                    {formatTenantMoneyWithSymbol(unitsToAmount(Math.abs(totals.difference)), currencySymbol)}
                  </Typography.Text>
                </div>
              </div>
            </div>
          </section>
        </Form>
      </div>
    </ResourceCrudDrawer>
  );
}
