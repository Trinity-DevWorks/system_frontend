"use client";

import { useForwardArrow } from "@/lib/direction-arrow";
import { DownOutlined } from "@ant-design/icons";
import { fetchAccounts } from "@/features/accounting/api/accounting.api";
import {
  fetchCurrencyNames,
  fetchCurrencyPairRates,
} from "@/features/currencies/api/currencies.api";
import { rateFromPrimary } from "@/lib/currency/documentExchangeRate";
import StockDocumentDrawerFooter from "@/features/stock/components/StockDocumentDrawerFooter";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import {
  dayjsDatePattern,
  formatTenantDate,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import DeferralActionDialog from "../DeferralActionDialog";
import ResourceDrawerTabs from "@/shared/components/resource-drawer/ResourceDrawerTabs";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
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
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  activateDeferralSchedule,
  createDeferralSchedule,
  deleteDeferralSchedule,
  fetchDeferralDefaults,
  fetchDeferralSchedule,
  pauseDeferralSchedule,
  postDeferralLine,
  postDueDeferralSchedule,
  previewDeferralSchedule,
  resumeDeferralSchedule,
  reverseDeferralLine,
  updateDeferralSchedule,
} from "../../api/deferralSchedules.api";
import {
  DEFERRAL_SCHEDULES_LIST_QUERY_KEY,
  deferralScheduleDetailQueryKey,
} from "../../queries/deferralSchedulesQueryKeys";
import {
  deferralDefaults,
  deferralToFormValues,
  deferralToPayload,
} from "../../utils/deferralDrawerUtils";

const STATUS_COLOR = {
  draft: "default",
  active: "green",
  paused: "gold",
  completed: "blue",
  cancelled: "default",
};
const LINE_COLOR = {
  pending: "default",
  posted: "green",
  cancelled: "default",
};

/** @param {unknown} rows */
function accountOptions(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((a) => a && !a.is_group)
    .map((a) => ({ value: Number(a.id), label: `${a.code} — ${a.name}` }));
}

/**
 * Prepaid expense / deferred revenue schedule: one amount spread over months, one journal entry per month.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; deferralScheduleId: string | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function DeferralScheduleDrawer({
  open,
  mode,
  deferralScheduleId,
  onClose,
  onCreated,
}) {
  const t = useTranslations("DeferralSchedules");
  const arrow = useForwardArrow();
  const tApiErrors = useTranslations("ApiErrors");
  const access = useResourceAccess("deferral_schedules");
  const { settings } = useCompanySettings();
  const { message, notification, modal } = App.useApp();
  const { openStackedDrawer } = useGlobalDrawer();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const scheduleId = deferralScheduleId ?? savedId;
  const creating = scheduleId == null;
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [dialog, setDialog] = useState(
    /** @type {null | "reschedule" | "recognize" | "cancel"} */ (null),
  );
  const required = (label) => [
    { required: true, message: t("fieldRequired", { field: label }) },
  ];

  const detail = useQuery({
    queryKey: deferralScheduleDetailQueryKey(scheduleId ?? "new"),
    queryFn: () => fetchDeferralSchedule(String(scheduleId)),
    enabled: open && !creating,
  });
  const record = /** @type {Record<string, any> | null} */ (
    detail.data && typeof detail.data === "object" ? detail.data : null
  );
  const status = record?.status ?? "draft";
  const draft = status === "draft";
  const readOnly =
    mode === "view" || !draft || (creating ? !access.canAdd : !access.canEdit);
  const kind = Form.useWatch("kind", form) ?? "prepaid_expense";
  const currencyId = Form.useWatch("currency_id", form);

  const enabled = open;
  const currencies = useQuery({
    queryKey: ["tenant", "currencies", "names"],
    queryFn: fetchCurrencyNames,
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  // Stored currency rates, to fill the exchange rate like the other document drawers.
  const pairRates = useQuery({
    queryKey: ["tenant", "currencies", "pair-rates"],
    queryFn: fetchCurrencyPairRates,
    enabled: enabled && !readOnly,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const accounts = useQuery({
    queryKey: ["tenant", "accounts", "deferral-schedule"],
    queryFn: () =>
      Promise.all(
        ["asset", "liability", "expense", "revenue"].map((type) =>
          fetchAccounts({ type, postable: true, active: true }),
        ),
      ),
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const defaults = useQuery({
    queryKey: ["tenant", "deferral-schedules", "defaults"],
    queryFn: fetchDeferralDefaults,
    enabled: open && creating,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const [assetOpts, liabilityOpts, expenseOpts, revenueOpts] = useMemo(
    () => (accounts.data ?? [[], [], [], []]).map(accountOptions),
    [accounts.data],
  );
  const prepaid = kind !== "deferred_revenue";

  // Fill the form once per opening (or after a refetch of the saved schedule).
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
        form.setFieldsValue({
          ...deferralDefaults(),
          currency_id: settings.primaryCurrencyId ?? undefined,
        });
        setDirty(false);
      }
      // Company settings can arrive after the form is filled; default the currency once they do.
      if (
        settings.primaryCurrencyId != null &&
        form.getFieldValue("currency_id") == null &&
        !form.isFieldTouched("currency_id")
      ) {
        form.setFieldValue("currency_id", Number(settings.primaryCurrencyId));
      }
      const account = defaults.data?.[kind];
      if (
        account?.id != null &&
        form.getFieldValue("deferral_account_id") == null &&
        !form.isFieldTouched("deferral_account_id")
      ) {
        form.setFieldValue("deferral_account_id", Number(account.id));
      }
      return;
    }
    const stamp = `${scheduleId}:${detail.dataUpdatedAt}`;
    if (record && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.resetFields();
      form.setFieldsValue(deferralToFormValues(record));
      setDirty(false);
    }
  }, [
    open,
    creating,
    scheduleId,
    record,
    detail.dataUpdatedAt,
    defaults.data,
    kind,
    form,
    settings.primaryCurrencyId,
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

  const refresh = (data) => {
    invalidateTenantListQueries(queryClient, DEFERRAL_SCHEDULES_LIST_QUERY_KEY);
    queryClient.invalidateQueries({ queryKey: ["tenant", "journal-entries"] });
    // Use the returned schedule directly (also on the first save, before the id is in state),
    // so the drawer does not reload and flash its fields.
    if (data && typeof data === "object" && data.id)
      queryClient.setQueryData(
        deferralScheduleDetailQueryKey(String(scheduleId ?? data.id)),
        data,
      );
    else if (scheduleId)
      queryClient.invalidateQueries({
        queryKey: deferralScheduleDetailQueryKey(scheduleId),
      });
  };
  const onError = (err) =>
    notification.error({
      title: t("actionError"),
      description: getLocalizedApiErrorMessage(tApiErrors, err),
    });

  const save = useMutation({
    mutationFn: (values) => {
      const body = deferralToPayload(values);
      return creating
        ? createDeferralSchedule(body)
        : updateDeferralSchedule(String(scheduleId), body);
    },
    onError,
  });
  const action = useMutation({
    /** @param {{ name: string; run: () => Promise<any> }} job */
    mutationFn: (job) => job.run(),
    onSuccess: (data, job) => {
      const warnings = data?.warnings ?? data?.schedule?.warnings;
      if (Array.isArray(warnings) && warnings.length) {
        modal.warning({
          title: t("balanceWarning"),
          content: warnings.map((w) => w.message).join(" "),
        });
      }
      if (job.name === "postDue")
        message.success(t("postDueDone", { count: Number(data?.posted ?? 0) }));
      else message.success(t(`${job.name}Success`));
      if (job.name === "delete") {
        invalidateTenantListQueries(
          queryClient,
          DEFERRAL_SCHEDULES_LIST_QUERY_KEY,
        );
        forceClose();
        return;
      }
      refresh(data?.schedule ?? data);
      setDialog(null);
    },
    onError,
  });
  const busy = save.isPending || action.isPending;
  const id = String(scheduleId);

  /** Save (when needed) and return the saved record. */
  const saveDraft = async () => {
    // Errors are on the form; show that tab.
    const values = await form.validateFields().catch((err) => {
      setActiveTab("details");
      throw err;
    });
    const saved = await save.mutateAsync({
      ...form.getFieldsValue(true),
      ...values,
    });
    setDirty(false);
    if (creating && saved?.id) {
      setSavedId(String(saved.id));
      onCreated?.(saved);
    }
    refresh(saved);
    return saved;
  };
  const onSave = () =>
    saveDraft()
      .then(() => message.success(t("saveSuccess")))
      .catch(() => {});
  const onActivate = () =>
    modal.confirm({
      title: t("activateTitle"),
      content: t("activateContent"),
      okText: t("actionActivate"),
      cancelText: t("drawerCancel"),
      onOk: () =>
        (dirty || creating ? saveDraft() : Promise.resolve(record))
          .then((saved) =>
            action.mutateAsync({
              name: "activate",
              run: () => activateDeferralSchedule(String(saved?.id ?? id)),
            }),
          )
          .catch(() => {}),
    });
  const confirmRun = (name, run, danger = false) =>
    modal.confirm({
      title: t(`${name}Title`),
      content: t(`${name}Content`),
      okText: t(`action${name[0].toUpperCase()}${name.slice(1)}`),
      okButtonProps: danger ? { danger: true } : undefined,
      cancelText: t("drawerCancel"),
      onOk: () => action.mutateAsync({ name, run }).catch(() => {}),
    });

  // Live preview of the lines while drafting (debounced).
  const watchedAll = Form.useWatch([], form);
  const [draftBody, setDraftBody] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  useEffect(() => {
    if (!open || readOnly) return undefined;
    const timer = setTimeout(
      () => setDraftBody(deferralToPayload(form.getFieldsValue(true))),
      500,
    );
    return () => clearTimeout(timer);
  }, [watchedAll, open, readOnly, form]);
  const previewReady =
    !readOnly &&
    Boolean(
      draftBody?.total_amount &&
      draftBody?.start_date &&
      draftBody?.end_date &&
      draftBody?.recognition_account_id,
    );
  const preview = useQuery({
    queryKey: ["tenant", "deferral-preview", JSON.stringify(draftBody)],
    queryFn: () =>
      previewDeferralSchedule({ ...draftBody, name: draftBody?.name || "-" }),
    enabled: open && previewReady,
    retry: false,
  });

  const currencyMark =
    record?.currency?.symbol ||
    (Array.isArray(currencies.data)
      ? currencies.data.find((c) => Number(c.id) === Number(currencyId))?.code
      : null) ||
    settings.primaryCurrencySymbol ||
    "";
  const money = (value) =>
    formatTenantMoneyWithSymbol(value ?? 0, currencyMark);
  const lines = readOnly
    ? Array.isArray(record?.lines)
      ? record.lines
      : []
    : Array.isArray(preview.data?.lines)
      ? preview.data.lines
      : [];
  const firstPending = lines.find((l) => l.status === "pending");
  const lastPosted = [...lines].reverse().find((l) => l.status === "posted");
  const today = dayjs().format("YYYY-MM-DD");
  const foreign =
    currencyId != null &&
    settings.primaryCurrencyId != null &&
    Number(currencyId) !== Number(settings.primaryCurrencyId);

  const cancelledNote = record?.cancellation_reason ? (
    <Alert
      type="info"
      showIcon
      className="!mb-4"
      title={t("cancelledBecause", { reason: record.cancellation_reason })}
    />
  ) : null;
  // A schedule made from an expense voucher shows the voucher number in the title, as a link to it.
  const sourceLink =
    record?.source?.type === "expense_voucher" && record.source.id ? (
      <Button
        type="link"
        className="!h-auto !p-0 !text-[length:inherit] !font-[inherit]"
        aria-label={`${t("source_expense_voucher")} ${record.source.number ?? ""}`}
        onClick={() =>
          openStackedDrawer({
            featureId: "expenseVouchers",
            id: String(record.source.id),
            mode: "view",
          })
        }
      >
        {record.source.number || t("source_expense_voucher")}
      </Button>
    ) : null;

  // Rates can arrive after the currency was picked: fill the rate then, unless the user typed one.
  useEffect(() => {
    if (readOnly || !foreign || !pairRates.data) return;
    const current = form.getFieldValue("exchange_rate");
    if (current != null && current !== "") return;
    const rate = rateFromPrimary(
      pairRates.data,
      settings.primaryCurrencyId,
      currencyId,
    );
    if (rate != null) form.setFieldValue("exchange_rate", rate);
  }, [
    readOnly,
    foreign,
    pairRates.data,
    currencyId,
    settings.primaryCurrencyId,
    form,
  ]);

  const lineColumns = [
    { title: "#", dataIndex: "line_no", width: 48 },
    {
      title: t("colPeriod"),
      key: "period",
      render: (_, row) =>
        `${formatTenantDate(row.period_start)} ${arrow} ${formatTenantDate(row.period_end)}`,
    },
    {
      title: t("colPosting"),
      dataIndex: "posting_date",
      width: 120,
      render: (value) => formatTenantDate(value),
    },
    {
      title: t("colAmount"),
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (value) => money(value),
    },
    ...(readOnly
      ? [
          {
            title: t("colStatus"),
            dataIndex: "status",
            width: 100,
            render: (value) => (
              <Tag color={LINE_COLOR[value] ?? "default"}>
                {t(`line_${value}`)}
              </Tag>
            ),
          },
          {
            title: t("colEntry"),
            key: "entry",
            width: 170,
            render: (_, row) =>
              row.journal_entry?.id ? (
                <Button
                  type="link"
                  className="!px-0"
                  onClick={() =>
                    openStackedDrawer({
                      featureId: "journalEntries",
                      id: String(row.journal_entry.id),
                      mode: "view",
                    })
                  }
                >
                  {row.journal_entry.entry_number}
                </Button>
              ) : (
                "—"
              ),
          },
          {
            title: "",
            key: "actions",
            width: 110,
            align: "end",
            render: (_, row) => {
              if (
                status === "active" &&
                row.id === firstPending?.id &&
                access.canEdit
              ) {
                return (
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() =>
                      modal.confirm({
                        title: t("postLineTitle"),
                        content:
                          row.posting_date > today
                            ? t("postLineEarly", {
                                date: formatTenantDate(row.posting_date),
                              })
                            : t("postLineContent"),
                        okText: t("actionPost"),
                        cancelText: t("drawerCancel"),
                        onOk: () =>
                          action
                            .mutateAsync({
                              name: "postLine",
                              run: () => postDeferralLine(id, row.id),
                            })
                            .catch(() => {}),
                      })
                    }
                  >
                    {t("actionPost")}
                  </Button>
                );
              }
              if (
                row.id === lastPosted?.id &&
                access.canReverse &&
                status !== "cancelled"
              ) {
                return (
                  <Button
                    size="small"
                    danger
                    disabled={busy}
                    onClick={() =>
                      modal.confirm({
                        title: t("reverseLineTitle"),
                        content: t("reverseLineContent"),
                        okText: t("actionReverse"),
                        okButtonProps: { danger: true },
                        cancelText: t("drawerCancel"),
                        onOk: () =>
                          action
                            .mutateAsync({
                              name: "reverseLine",
                              run: () => reverseDeferralLine(id, row.id),
                            })
                            .catch(() => {}),
                      })
                    }
                  >
                    {t("actionReverse")}
                  </Button>
                );
              }
              return null;
            },
          },
        ]
      : []),
  ];

  /** @param {"reschedule" | "recognize" | "cancel"} name */
  const openDialog = (name) => setDialog(name);

  // One main button (Post due, or Resume when paused); the rest go under "More".
  const running = status === "active" || status === "paused";
  const canCancel =
    running &&
    access.canReverse &&
    Number(record?.posted_lines_count ?? 0) === 0;
  const moreItems = [
    ...(status === "active" ? [{ key: "pause", label: t("actionPause") }] : []),
    ...(running ? [{ key: "reschedule", label: t("actionReschedule") }] : []),
    ...(status === "active"
      ? [{ key: "recognize", label: t("actionRecognize") }]
      : []),
    ...(canCancel
      ? [
          { type: "divider" },
          { key: "cancel", label: t("actionCancelSchedule"), danger: true },
        ]
      : []),
  ];
  const onMore = (key) => {
    if (key === "pause") confirmRun("pause", () => pauseDeferralSchedule(id));
    else openDialog(/** @type {"reschedule" | "recognize" | "cancel"} */ (key));
  };
  // Post due only when a pending month is dated today or earlier.
  const hasDue =
    status === "active" &&
    Boolean(record?.next_posting_date) &&
    String(record.next_posting_date).slice(0, 10) <= today;
  const viewActions =
    record && !draft && access.canEdit && running ? (
      <>
        {moreItems.length ? (
          <Dropdown
            trigger={["click"]}
            disabled={busy}
            menu={{
              items: moreItems,
              onClick: ({ key }) => onMore(String(key)),
            }}
          >
            <Button disabled={busy}>
              {t("actionMore")} <DownOutlined />
            </Button>
          </Dropdown>
        ) : null}
        {status === "paused" || hasDue ? (
          <Button
            type="primary"
            disabled={busy}
            onClick={() =>
              status === "paused"
                ? confirmRun("resume", () => resumeDeferralSchedule(id))
                : confirmRun("postDue", () => postDueDeferralSchedule(id))
            }
          >
            {t(status === "paused" ? "actionResume" : "actionPostDue")}
          </Button>
        ) : null}
      </>
    ) : null;

  return (
    <ResourceCrudDrawer
      // New schedules go to the user's active branch; the header shows it when there are several branches.
      documentBranch={record ?? null}
      title={
        creating ? (
          t("drawerTitleCreate")
        ) : sourceLink ? (
          <span>
            {record?.schedule_number ? `${record.schedule_number} · ` : null}
            {sourceLink}
          </span>
        ) : (
          [record?.schedule_number, record?.name].filter(Boolean).join(" · ") ||
          t("drawerTitleView")
        )
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
      size={940}
      footer={
        <StockDocumentDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={busy}
          showDelete={!creating && draft && access.canDelete}
          onDelete={() =>
            confirmRun("delete", () => deleteDeferralSchedule(id), true)
          }
          onSave={onSave}
          showPrimary={access.canEdit}
          primaryLabel={t("actionActivate")}
          onPrimary={onActivate}
          readOnlyExtras={viewActions}
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
                <>
                  {cancelledNote}
                  <Form
                    form={form}
                    layout="vertical"
                    disabled={readOnly}
                    requiredMark={readOnly ? false : "optional"}
                    onValuesChange={() => setDirty(true)}
                  >
                    <>
                      <section>
                        <ResourceDrawerPanelHeader
                          title={t("sectionGeneral")}
                        />
                        <Form.Item
                          name="kind"
                          label={t("fieldKind")}
                          rules={required(t("fieldKind"))}
                          tooltip={
                            prepaid
                              ? t("kindPrepaidHelp")
                              : t("kindDeferredHelp")
                          }
                        >
                          <Radio.Group
                            optionType="button"
                            buttonStyle="solid"
                            onChange={(e) => {
                              const account = defaults.data?.[e.target.value];
                              form.setFieldsValue({
                                deferral_account_id:
                                  account?.id != null
                                    ? Number(account.id)
                                    : undefined,
                                recognition_account_id: undefined,
                              });
                            }}
                            options={[
                              {
                                value: "prepaid_expense",
                                label: t("kind_prepaid_expense"),
                              },
                              {
                                value: "deferred_revenue",
                                label: t("kind_deferred_revenue"),
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
                              placeholder={
                                prepaid
                                  ? t("namePlaceholderPrepaid")
                                  : t("namePlaceholderDeferred")
                              }
                            />
                          </Form.Item>
                          <Form.Item
                            name="description"
                            label={t("fieldDescription")}
                          >
                            <Input maxLength={500} />
                          </Form.Item>
                        </div>
                      </section>

                      <Divider className="!mb-6 !mt-2" />

                      <section>
                        <ResourceDrawerPanelHeader title={t("sectionAmount")} />
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                          {/* Currency first, then its rate (foreign only), then the amount in that currency. */}
                          <Form.Item
                            name="currency_id"
                            label={t("fieldCurrency")}
                            rules={required(t("fieldCurrency"))}
                          >
                            <Select
                              options={(Array.isArray(currencies.data)
                                ? currencies.data
                                : []
                              ).map((c) => ({
                                value: Number(c.id),
                                label: c.code ?? c.name,
                              }))}
                              getPopupContainer={drawerSelectGetPopup}
                              onChange={(next) =>
                                form.setFieldValue(
                                  "exchange_rate",
                                  rateFromPrimary(
                                    pairRates.data ?? [],
                                    settings.primaryCurrencyId,
                                    next,
                                  ) ?? undefined,
                                )
                              }
                            />
                          </Form.Item>
                          {foreign ? (
                            <Form.Item
                              name="exchange_rate"
                              label={t("fieldRate")}
                              tooltip={t("rateHelp")}
                            >
                              <TenantNumberInput
                                kind="rate"
                                min={0}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          ) : null}
                          <Form.Item
                            name="total_amount"
                            label={t("fieldAmount")}
                            rules={required(t("fieldAmount"))}
                          >
                            <TenantNumberInput
                              kind="money"
                              min={0.01}
                              style={{ width: "100%" }}
                              addonAfter={currencyMark || undefined}
                            />
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                          <Form.Item
                            name="period"
                            label={t("fieldPeriod")}
                            rules={required(t("fieldPeriod"))}
                            className="md:col-span-1"
                          >
                            <DatePicker.RangePicker
                              className="w-full"
                              format={dayjsDatePattern()}
                              // Locked view: the dates may not be loaded yet; an empty locked picker is fine.
                              allowEmpty={readOnly ? [true, true] : undefined}
                            />
                          </Form.Item>
                          <Form.Item name="method" label={t("fieldMethod")}>
                            <Select
                              getPopupContainer={drawerSelectGetPopup}
                              options={[
                                {
                                  value: "straight_line_monthly",
                                  label: t("method_straight_line_monthly"),
                                },
                                {
                                  value: "daily_prorata",
                                  label: t("method_daily_prorata"),
                                },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name="posting_day"
                            label={t("fieldPostingDay")}
                          >
                            <Select
                              getPopupContainer={drawerSelectGetPopup}
                              options={[
                                {
                                  value: "period_end",
                                  label: t("posting_period_end"),
                                },
                                {
                                  value: "period_start",
                                  label: t("posting_period_start"),
                                },
                              ]}
                            />
                          </Form.Item>
                        </div>
                        <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3">
                          <div className="min-w-0 font-medium">
                            <ResourceDrawerFieldLabel
                              text={t("fieldAutoPost")}
                              help={t("autoPostHelp")}
                            />
                          </div>
                          <Form.Item
                            name="auto_post"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch />
                          </Form.Item>
                        </div>
                      </section>

                      <Divider className="!mb-6 !mt-2" />

                      <section>
                        <ResourceDrawerPanelHeader
                          title={t("sectionAccounts")}
                          help={
                            prepaid
                              ? t("accountsPrepaidHelp")
                              : t("accountsDeferredHelp")
                          }
                        />
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                          <Form.Item
                            name="deferral_account_id"
                            label={
                              prepaid
                                ? t("fieldPrepaidAccount")
                                : t("fieldUnearnedAccount")
                            }
                            rules={required(t("fieldDeferralAccount"))}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              loading={accounts.isPending}
                              options={prepaid ? assetOpts : liabilityOpts}
                              getPopupContainer={drawerSelectGetPopup}
                            />
                          </Form.Item>
                          <Form.Item
                            name="recognition_account_id"
                            label={
                              prepaid
                                ? t("fieldExpenseAccount")
                                : t("fieldRevenueAccount")
                            }
                            rules={required(t("fieldRecognitionAccount"))}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              loading={accounts.isPending}
                              options={prepaid ? expenseOpts : revenueOpts}
                              getPopupContainer={drawerSelectGetPopup}
                            />
                          </Form.Item>
                        </div>
                      </section>
                    </>
                  </Form>
                </>
              ),
            },
            {
              key: "schedule",
              label: t("tabSchedule"),
              hidePanelHeading: true,
              children: (
                <section>
                  <ResourceDrawerPanelHeader
                    title={t("sectionLines")}
                    help={readOnly ? undefined : t("linesPreviewHelp")}
                  />
                  {!readOnly && !previewReady ? (
                    <Typography.Text type="secondary">
                      {t("previewHint")}
                    </Typography.Text>
                  ) : !readOnly && preview.isError ? (
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
                      rowKey={(row) => row.id ?? row.line_no}
                      loading={!readOnly && preview.isFetching}
                      pagination={
                        lines.length > 24
                          ? { pageSize: 24, showSizeChanger: false }
                          : false
                      }
                      dataSource={lines}
                      columns={lineColumns}
                      summary={() =>
                        lines.length ? (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <strong>{t("colTotal")}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <strong>
                                {money(
                                  lines
                                    .filter((l) => l.status !== "cancelled")
                                    .reduce(
                                      (sum, l) => sum + Number(l.amount || 0),
                                      0,
                                    ),
                                )}
                              </strong>
                            </Table.Summary.Cell>
                            {readOnly ? (
                              <Table.Summary.Cell index={4} colSpan={3} />
                            ) : null}
                          </Table.Summary.Row>
                        ) : null
                      }
                    />
                  )}
                </section>
              ),
            },
          ]}
        />
      </div>

      <DeferralActionDialog
        dialog={dialog}
        record={record}
        onClose={() => setDialog(null)}
        onDone={(data) => refresh(data?.schedule ?? data)}
      />
    </ResourceCrudDrawer>
  );
}
