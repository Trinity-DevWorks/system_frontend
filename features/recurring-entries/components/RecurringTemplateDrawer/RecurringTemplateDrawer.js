"use client";

import { fetchAccounts } from "@/features/accounting/api/accounting.api";
import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import { fetchCurrencyNames } from "@/features/currencies/api/currencies.api";
import StockDocumentDrawerFooter from "@/features/stock/components/StockDocumentDrawerFooter";
import { fetchSupplierNames } from "@/features/suppliers/api/suppliers.api";
import { fetchVatGroupNames } from "@/features/vat-groups/api/vatGroups.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import {
  dayjsDatePattern,
  formatTenantDate,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import ResourceDrawerTabs from "@/shared/components/resource-drawer/ResourceDrawerTabs";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { DownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  Radio,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchRecurringTemplate,
  previewRecurringTemplate,
  previewRecurringTemplateDraft,
} from "../../api/recurringTemplates.api";
import { recurringTemplateDetailQueryKey } from "../../queries/recurringEntriesQueryKeys";
import { useRecurringTemplateActions } from "../../queries/useRecurringTemplateActions";
import { useRecurringTemplateMutations } from "../../queries/useRecurringTemplateMutations";
import { useRecurringTemplatesDelete } from "../../queries/useRecurringTemplatesDelete";
import {
  emptyLine,
  recurringDefaults,
  toFormValues,
  toPayload,
} from "../../utils/recurringTemplateDrawerUtils";
import RecurringLinesEditor from "./RecurringLinesEditor";

const MONTHLY = ["monthly", "quarterly", "semi_annual", "yearly"];
const STATUS_COLOR = {
  active: "green",
  paused: "gold",
  completed: "blue",
  cancelled: "default",
};
const RUN_COLOR = {
  generated: "gold",
  posted: "green",
  failed: "red",
  skipped: "default",
};

/**
 * A switch on the right of a short title and explanation, inside a bordered row.
 *
 * @param {{ name: string; title: string; help: string; disabled?: boolean }} props
 */
function SwitchRow({ name, title, help, disabled }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3">
      <div className="min-w-0 font-medium">
        <ResourceDrawerFieldLabel text={title} help={help} />
      </div>
      <Form.Item name={name} valuePropName="checked" noStyle>
        <Switch disabled={disabled} />
      </Form.Item>
    </div>
  );
}

/**
 * Recurring template: what to generate (voucher or journal entry), when, and its run history.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; recurringTemplateId: string | null; onClose: () => void; onCreated?: (record: Record<string, unknown>) => void; createSeed?: Record<string, unknown> | null }} props
 */
export default function RecurringTemplateDrawer({
  open,
  mode,
  recurringTemplateId,
  onClose,
  onCreated,
  createSeed = null,
}) {
  const t = useTranslations("RecurringEntries");
  const tApiErrors = useTranslations("ApiErrors");
  const access = useResourceAccess("recurring_entries");
  const { message, notification, modal } = App.useApp();
  const { openStackedDrawer } = useGlobalDrawer();
  const [form] = Form.useForm();
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const templateId = recurringTemplateId ?? savedId;
  const creating = templateId == null;
  // True only after the user edits the form (programmatic fills do not count).
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const required = (label) => [
    { required: true, message: t("fieldRequired", { field: label }) },
  ];

  const detail = useQuery({
    queryKey: recurringTemplateDetailQueryKey(templateId ?? "new"),
    queryFn: () => fetchRecurringTemplate(String(templateId)),
    enabled: open && !creating,
    staleTime: QUERY_STALE_TIME.default,
  });
  const record = /** @type {Record<string, any> | null} */ (
    detail.data && typeof detail.data === "object" ? detail.data : null
  );
  const status = record?.status ?? "active";
  const finished = status === "completed" || status === "cancelled";
  const readOnly =
    mode === "view" ||
    finished ||
    (creating ? !access.canAdd : !access.canEdit);
  const lockedSchedule = Number(record?.occurrences_count ?? 0) > 0;

  const documentType =
    Form.useWatch("document_type", form) ?? "expense_voucher";
  const frequency = Form.useWatch("frequency", form);
  const endMode = Form.useWatch("end_mode", form);
  const rateMode = Form.useWatch("rate_mode", form);
  const cashId = Form.useWatch("cash_bank_account_id", form);
  const currencyId = Form.useWatch("currency_id", form);

  // Fill the form once per opening (or after a refetch of the saved template).
  const loadedFor = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (creating) {
      if (loadedFor.current !== "create") {
        loadedFor.current = "create";
        form.resetFields();
        form.setFieldsValue(
          createSeed
            ? { ...recurringDefaults(), ...createSeed }
            : recurringDefaults(),
        );
        setDirty(false);
      }
      return;
    }
    const stamp = `${templateId}:${detail.dataUpdatedAt}`;
    if (record && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.resetFields();
      form.setFieldsValue(toFormValues(record));
      setDirty(false);
    }
  }, [
    open,
    creating,
    templateId,
    record,
    detail.dataUpdatedAt,
    form,
    createSeed,
  ]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: () => {
      setSavedId(null);
      onClose();
    },
    shouldConfirmDiscard: () => dirty,
  });

  const { save, saving } = useRecurringTemplateMutations({
    form,
    message,
    notification,
    t,
    tApiErrors,
    templateId,
    onCreated: (created) => {
      setDirty(false);
      setSavedId(created?.id ? String(created.id) : null);
      onCreated?.(created);
    },
    onSaved: () => setDirty(false),
  });
  const actions = useRecurringTemplateActions({
    t,
    tApiErrors,
    message,
    notification,
  });
  const { requestDelete } = useRecurringTemplatesDelete({
    t,
    tApiErrors,
    message,
    notification,
    modal,
    onDeleted: () => forceClose(),
  });

  const enabled = open;
  const accounts = useQuery({
    queryKey: ["tenant", "accounts", "postable"],
    queryFn: () => fetchAccounts({ postable: true, active: true }),
    staleTime: QUERY_STALE_TIME.catalog,
    enabled,
  });
  const cash = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: fetchCashBankAccountNames,
    staleTime: QUERY_STALE_TIME.catalog,
    enabled,
  });
  const currencies = useQuery({
    queryKey: ["tenant", "currencies", "names"],
    queryFn: fetchCurrencyNames,
    staleTime: QUERY_STALE_TIME.catalog,
    enabled,
  });
  const suppliers = useQuery({
    queryKey: ["tenant", "suppliers", "names"],
    queryFn: fetchSupplierNames,
    staleTime: QUERY_STALE_TIME.catalog,
    enabled,
  });
  const vatGroups = useQuery({
    queryKey: ["tenant", "vat-groups"],
    queryFn: fetchVatGroupNames,
    staleTime: QUERY_STALE_TIME.catalog,
    enabled,
  });

  const list = (query) => (Array.isArray(query.data) ? query.data : []);
  const accountOptions = useMemo(
    () =>
      list(accounts)
        .filter(
          (account) =>
            !account.is_group &&
            (documentType !== "expense_voucher" || account.type === "expense"),
        )
        .map((account) => ({
          value: Number(account.id),
          label: `${account.code} — ${account.name}`,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts.data, documentType],
  );
  const cashOptions = list(cash).map((a) => ({
    value: Number(a.id),
    label: `${a.code} — ${a.name}${a.currency_code ? ` (${a.currency_code})` : ""}`,
    disabled: a.is_active === false,
  }));
  const vatOptions = list(vatGroups).map((v) => ({
    value: Number(v.id),
    label: `${v.name ?? v.abrv} (${Number(v.percentage ?? 0)}%)`,
  }));
  const currencyMark =
    documentType === "expense_voucher"
      ? (list(cash).find((a) => Number(a.id) === Number(cashId))
          ?.currency_code ??
        record?.currency?.symbol ??
        "")
      : (list(currencies).find((c) => Number(c.id) === Number(currencyId))
          ?.code ??
        record?.currency?.symbol ??
        "");

  // Preview of the next dates: from the saved template in view mode, from the form (debounced) otherwise.
  const watchedAll = Form.useWatch([], form);
  const [draftBody, setDraftBody] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  useEffect(() => {
    if (!open || readOnly) return undefined;
    const timer = setTimeout(
      () => setDraftBody(toPayload(form.getFieldsValue(true))),
      500,
    );
    return () => clearTimeout(timer);
  }, [watchedAll, open, readOnly, form]);
  const previewReady = readOnly
    ? !creating
    : Boolean(
        draftBody?.start_date &&
        Array.isArray(draftBody?.lines) &&
        draftBody.lines.length > 0,
      );
  const preview = useQuery({
    queryKey: [
      "tenant",
      "recurring-preview",
      readOnly ? templateId : JSON.stringify(draftBody),
    ],
    queryFn: () =>
      readOnly
        ? previewRecurringTemplate(String(templateId), 6)
        : previewRecurringTemplateDraft(
            { ...draftBody, name: draftBody?.name || "-" },
            6,
          ),
    enabled: open && previewReady,
    retry: false,
    staleTime: 0,
  });

  const submit = () =>
    form
      .validateFields()
      .then((values) =>
        save.mutate({ ...form.getFieldsValue(true), ...values }),
      )
      // Errors are on the form; show that tab.
      .catch(() => setActiveTab("details"));

  const confirmAction = (action) => {
    if (action === "resume") {
      let catchUp = false;
      modal.confirm({
        title: t("resumeConfirmTitle"),
        content: (
          <div className="flex flex-col gap-3">
            <span>{t("resumeConfirmContent")}</span>
            <Checkbox onChange={(e) => (catchUp = e.target.checked)}>
              {t("resumeCatchUp")}
            </Checkbox>
          </div>
        ),
        okText: t("actionResume"),
        cancelText: t("drawerCancel"),
        onOk: () =>
          actions
            .mutateAsync({ id: templateId, action, catchUp })
            .catch(() => {}),
      });
      return;
    }
    modal.confirm({
      title: t(`${action}ConfirmTitle`),
      content: t(`${action}ConfirmContent`, { name: record?.name ?? "" }),
      okText:
        action === "cancel"
          ? t("actionCancelTemplate")
          : t(`action${action[0].toUpperCase()}${action.slice(1)}`),
      okButtonProps: action === "cancel" ? { danger: true } : undefined,
      cancelText: t("drawerCancel"),
      onOk: () =>
        actions
          .mutateAsync({ id: templateId, action })
          .then((result) => {
            if (action === "run" && result && typeof result === "object") {
              const counts = /** @type {Record<string, number>} */ (result);
              const text = t("runResult", {
                generated: Number(counts.generated ?? 0),
                failed: Number(counts.failed ?? 0),
              });
              if (Number(counts.failed ?? 0) > 0) message.warning(text);
              else message.info(text);
            }
          })
          .catch(() => {}),
    });
  };

  const busy = saving || actions.isPending;
  const runs = Array.isArray(record?.recent_runs) ? record.recent_runs : [];
  const previewRows = Array.isArray(preview.data) ? preview.data : [];
  // One main button (Run now, or Resume when paused); the rest go under "More".
  const moreItems = [
    ...(status === "active"
      ? [
          { key: "skip", label: t("actionSkip") },
          { key: "pause", label: t("actionPause") },
          { type: "divider" },
        ]
      : []),
    { key: "cancel", label: t("actionCancelTemplate"), danger: true },
  ];
  const viewActions =
    !creating && access.canEdit && !finished ? (
      <>
        <Dropdown
          trigger={["click"]}
          disabled={busy}
          menu={{
            items: moreItems,
            onClick: ({ key }) => confirmAction(String(key)),
          }}
        >
          <Button disabled={busy}>
            {t("actionMore")} <DownOutlined />
          </Button>
        </Dropdown>
        {status === "active" || status === "paused" ? (
          <Button
            type="primary"
            disabled={busy}
            onClick={() =>
              confirmAction(status === "paused" ? "resume" : "run")
            }
          >
            {t(status === "paused" ? "actionResume" : "actionRun")}
          </Button>
        ) : null}
      </>
    ) : null;

  return (
    <ResourceCrudDrawer
      // New templates go to the user's active branch; the header shows it when there are several branches.
      documentBranch={record ?? null}
      title={
        creating
          ? t("drawerTitleCreate")
          : [record?.template_number, record?.name]
              .filter(Boolean)
              .join(" · ") || t("drawerTitleView")
      }
      titleExtra={
        record ? (
          <Tag color={STATUS_COLOR[status] ?? "default"}>
            {t(`status_${status}`)}
          </Tag>
        ) : null
      }
      open={open}
      requestClose={requestClose}
      submitting={busy}
      showDetailLoading={!creating && detail.isPending}
      detailLoadFailed={!creating && detail.isError}
      detailError={detail.error}
      tApiErrors={tApiErrors}
      size={980}
      footer={
        <StockDocumentDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={busy}
          showDelete={
            !creating &&
            access.canDelete &&
            !lockedSchedule &&
            runs.length === 0
          }
          onDelete={() => requestDelete(record ?? { id: templateId })}
          onSave={submit}
          readOnlyExtras={viewActions}
          startExtras={dirty ? null : viewActions}
        />
      }
    >
      <div className="-mt-3">
        <ResourceDrawerTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "details",
              label: t("tabDetails"),
              hidePanelHeading: true,
              children: (
                <Form
                  form={form}
                  layout="vertical"
                  disabled={readOnly}
                  requiredMark={readOnly ? false : "optional"}
                  onValuesChange={() => setDirty(true)}
                >
                  <Form.Item name="occurrences_count" hidden>
                    <Input />
                  </Form.Item>

                  <section>
                    <ResourceDrawerPanelHeader title={t("sectionGeneral")} />
                    <Form.Item
                      name="document_type"
                      label={t("fieldType")}
                      rules={required(t("fieldType"))}
                      tooltip={lockedSchedule ? t("typeLocked") : undefined}
                    >
                      <Radio.Group
                        disabled={readOnly || lockedSchedule}
                        optionType="button"
                        buttonStyle="solid"
                        onChange={(e) =>
                          form.setFieldValue("lines", [
                            emptyLine(e.target.value),
                            ...(e.target.value === "journal_entry"
                              ? [emptyLine(e.target.value)]
                              : []),
                          ])
                        }
                        options={[
                          {
                            value: "expense_voucher",
                            label: t("type_expense_voucher"),
                          },
                          {
                            value: "journal_entry",
                            label: t("type_journal_entry"),
                          },
                        ]}
                      />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                      <Form.Item
                        name="name"
                        label={t("fieldName")}
                        rules={required(t("fieldName"))}
                      >
                        <Input
                          maxLength={255}
                          placeholder={t("namePlaceholder")}
                        />
                      </Form.Item>
                      <Form.Item
                        name="description"
                        label={t("fieldDescription")}
                        tooltip={t("placeholderHelp")}
                      >
                        <Input
                          maxLength={500}
                          placeholder={t("descriptionPlaceholder")}
                        />
                      </Form.Item>
                    </div>
                    {/* Same width as one column above. */}
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                      <SwitchRow
                        name="auto_post"
                        title={t("fieldAutoPost")}
                        help={t("autoPostHelp")}
                        disabled={readOnly}
                      />
                    </div>
                  </section>

                  <Divider className="!mb-6 !mt-2" />

                  <section>
                    <ResourceDrawerPanelHeader
                      title={t("sectionSchedule")}
                      help={t("sectionScheduleHelp")}
                    />
                    {lockedSchedule && !readOnly ? (
                      <Alert
                        type="info"
                        showIcon
                        className="!mb-4"
                        title={t("scheduleLocked")}
                      />
                    ) : null}
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                      <Form.Item
                        name="frequency"
                        label={t("fieldFrequency")}
                        rules={required(t("fieldFrequency"))}
                      >
                        <Select
                          disabled={readOnly || lockedSchedule}
                          getPopupContainer={drawerSelectGetPopup}
                          options={[
                            "daily",
                            "weekly",
                            "monthly",
                            "quarterly",
                            "semi_annual",
                            "yearly",
                          ].map((value) => ({
                            value,
                            label: t(`frequency_${value}`),
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name="interval"
                        label={t("fieldInterval")}
                        tooltip={t("intervalHelp")}
                      >
                        <TenantNumberInput
                          kind="integer"
                          min={1}
                          max={12}
                          style={{ width: "100%" }}
                          disabled={readOnly || lockedSchedule}
                        />
                      </Form.Item>
                      {MONTHLY.includes(String(frequency)) ? (
                        <Form.Item
                          name="day_of_month"
                          label={t("fieldDayOfMonth")}
                        >
                          <Select
                            disabled={readOnly || lockedSchedule}
                            getPopupContainer={drawerSelectGetPopup}
                            options={[
                              { value: -1, label: t("lastDay") },
                              ...Array.from({ length: 31 }, (_, i) => ({
                                value: i + 1,
                                label: String(i + 1),
                              })),
                            ]}
                          />
                        </Form.Item>
                      ) : frequency === "weekly" ? (
                        <Form.Item
                          name="day_of_week"
                          label={t("fieldDayOfWeek")}
                        >
                          <Select
                            disabled={readOnly || lockedSchedule}
                            getPopupContainer={drawerSelectGetPopup}
                            options={[1, 2, 3, 4, 5, 6, 7].map((value) => ({
                              value,
                              label: t(`weekday_${value}`),
                            }))}
                          />
                        </Form.Item>
                      ) : (
                        <div />
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                      <Form.Item
                        name="start_date"
                        label={t("fieldStart")}
                        rules={required(t("fieldStart"))}
                      >
                        <DatePicker
                          className="w-full"
                          format={dayjsDatePattern()}
                          disabled={readOnly || lockedSchedule}
                        />
                      </Form.Item>
                      <Form.Item name="end_mode" label={t("fieldEndMode")}>
                        <Select
                          getPopupContainer={drawerSelectGetPopup}
                          options={[
                            { value: "never", label: t("endNever") },
                            { value: "date", label: t("endOnDate") },
                            { value: "count", label: t("endAfter") },
                          ]}
                        />
                      </Form.Item>
                      {endMode === "date" ? (
                        <Form.Item
                          name="end_date"
                          label={t("fieldEnd")}
                          rules={required(t("fieldEnd"))}
                        >
                          <DatePicker
                            className="w-full"
                            format={dayjsDatePattern()}
                          />
                        </Form.Item>
                      ) : endMode === "count" ? (
                        <Form.Item
                          name="max_occurrences"
                          label={t("fieldMaxOccurrences")}
                          rules={required(t("fieldMaxOccurrences"))}
                        >
                          <TenantNumberInput
                            kind="integer"
                            min={1}
                            max={1000}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      ) : (
                        <div />
                      )}
                    </div>
                  </section>

                  <Divider className="!mb-6 !mt-2" />

                  <section>
                    {documentType === "expense_voucher" ? (
                      <>
                        <ResourceDrawerPanelHeader
                          title={t("sectionPayment")}
                        />
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                          <Form.Item
                            name="cash_bank_account_id"
                            label={t("fieldCash")}
                            rules={required(t("fieldCash"))}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              options={cashOptions}
                              loading={cash.isPending}
                              getPopupContainer={drawerSelectGetPopup}
                            />
                          </Form.Item>
                          <Form.Item
                            name="supplier_id"
                            label={t("fieldSupplier")}
                          >
                            <Select
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              options={list(suppliers).map((s) => ({
                                value: String(s.id),
                                label: s.name,
                              }))}
                              getPopupContainer={drawerSelectGetPopup}
                            />
                          </Form.Item>
                          <Form.Item name="payee" label={t("fieldPayee")}>
                            <Input maxLength={255} />
                          </Form.Item>
                          <Form.Item
                            name="reference"
                            label={t("fieldReference")}
                          >
                            <Input maxLength={128} />
                          </Form.Item>
                        </div>
                      </>
                    ) : (
                      <>
                        <ResourceDrawerPanelHeader
                          title={t("sectionJournal")}
                        />
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                          <Form.Item
                            name="currency_id"
                            label={t("fieldCurrency")}
                            rules={required(t("fieldCurrency"))}
                          >
                            <Select
                              options={list(currencies).map((c) => ({
                                value: Number(c.id),
                                label: c.code ?? c.name,
                              }))}
                              loading={currencies.isPending}
                              getPopupContainer={drawerSelectGetPopup}
                            />
                          </Form.Item>
                          <Form.Item
                            name="rate_mode"
                            label={t("fieldRateMode")}
                          >
                            <Select
                              getPopupContainer={drawerSelectGetPopup}
                              options={[
                                { value: "current", label: t("rateCurrent") },
                                { value: "fixed", label: t("rateFixed") },
                              ]}
                            />
                          </Form.Item>
                          {rateMode === "fixed" ? (
                            <Form.Item
                              name="fixed_exchange_rate"
                              label={t("fieldRate")}
                              rules={required(t("fieldRate"))}
                            >
                              <TenantNumberInput
                                kind="rate"
                                min={0}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          ) : (
                            <div />
                          )}
                          <Form.Item
                            name="reference"
                            label={t("fieldReference")}
                            className="md:col-span-3"
                          >
                            <Input maxLength={128} />
                          </Form.Item>
                        </div>
                      </>
                    )}
                    <Form.Item name="notes" label={t("fieldNotes")}>
                      <Input.TextArea rows={2} maxLength={2000} />
                    </Form.Item>
                  </section>

                  <Divider className="!mb-6 !mt-2" />

                  <RecurringLinesEditor
                    form={form}
                    t={t}
                    readOnly={readOnly}
                    documentType={documentType}
                    accountOptions={accountOptions}
                    accountsPending={accounts.isPending}
                    vatOptions={vatOptions}
                    currencyMark={currencyMark}
                  />
                </Form>
              ),
            },
            {
              key: "schedule",
              label: t("tabSchedule"),
              hidePanelHeading: true,
              children: (
                <>
                  <section>
                    <ResourceDrawerPanelHeader
                      title={t("sectionPreview")}
                      help={t("sectionPreviewHelp")}
                    />
                    {!previewReady ? (
                      <Typography.Text type="secondary">
                        {t("previewHint")}
                      </Typography.Text>
                    ) : preview.isError ? (
                      <Alert
                        type="warning"
                        showIcon
                        title={getLocalizedApiErrorMessage(
                          tApiErrors,
                          preview.error,
                        )}
                      />
                    ) : (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="date"
                        loading={preview.isFetching}
                        dataSource={previewRows}
                        locale={{ emptyText: t("previewEmpty") }}
                        columns={[
                          {
                            title: t("colDate"),
                            dataIndex: "date",
                            width: 140,
                            render: (value) => formatTenantDate(value),
                          },
                          {
                            title: t("colDescription"),
                            dataIndex: "description",
                            ellipsis: true,
                            render: (value) => value || "—",
                          },
                          {
                            title: t("colTotal"),
                            dataIndex: "total",
                            width: 160,
                            align: "right",
                            render: (value) =>
                              formatTenantMoneyWithSymbol(value, currencyMark),
                          },
                        ]}
                      />
                    )}
                  </section>

                  {!creating ? (
                    <>
                      <Divider className="!mb-6 !mt-6" />
                      <section>
                        <ResourceDrawerPanelHeader title={t("sectionRuns")} />
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="id"
                          dataSource={runs}
                          locale={{ emptyText: t("runsEmpty") }}
                          columns={[
                            {
                              title: t("colDate"),
                              dataIndex: "scheduled_date",
                              width: 130,
                              render: (value) => formatTenantDate(value),
                            },
                            {
                              title: t("colStatus"),
                              dataIndex: "status",
                              width: 110,
                              render: (value) => (
                                <Tag color={RUN_COLOR[value] ?? "default"}>
                                  {t(`run_${value}`)}
                                </Tag>
                              ),
                            },
                            {
                              title: t("colDocument"),
                              dataIndex: "document_number",
                              width: 190,
                              render: (value, row) =>
                                row.document_id ? (
                                  <Button
                                    type="link"
                                    className="!px-0"
                                    onClick={() =>
                                      openStackedDrawer({
                                        featureId:
                                          row.document_type ===
                                          "expense_voucher"
                                            ? "expenseVouchers"
                                            : "journalEntries",
                                        id: String(row.document_id),
                                        mode: "view",
                                      })
                                    }
                                  >
                                    {value || t("openDraft")}
                                  </Button>
                                ) : (
                                  "—"
                                ),
                            },
                            {
                              title: t("colError"),
                              dataIndex: "error_code",
                              ellipsis: true,
                              render: (value) =>
                                value
                                  ? tApiErrors.has(`codes.${value}`)
                                    ? tApiErrors(`codes.${value}`)
                                    : value
                                  : "—",
                            },
                            {
                              title: t("colTriggeredBy"),
                              key: "by",
                              width: 150,
                              render: (_, row) =>
                                row.triggered_by?.name ??
                                t("triggeredBySystem"),
                            },
                          ]}
                        />
                      </section>
                    </>
                  ) : null}
                </>
              ),
            },
          ]}
        />
      </div>
    </ResourceCrudDrawer>
  );
}
