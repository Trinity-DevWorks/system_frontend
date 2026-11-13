"use client";

import { isShownPriceField } from "@/lib/business-profile";
import { fetchBrandNames } from "@/features/brands/api/brands.api";
import { fetchCategoryNames } from "@/features/categories/api/categories.api";
import { fetchItemNames } from "@/features/items/api/items.api";
import {
  PRICE_CHANGES_QUERY_KEY,
  applyPriceChange,
  cancelPriceChange,
  createPriceChange,
  deletePriceChange,
  fetchPriceChange,
  previewPriceChangeBulk,
  updatePriceChange,
} from "@/features/price-changes/api/priceChanges.api";
import { fetchPriceListNames } from "@/features/price-lists/api/priceLists.api";
import StockDocumentDrawerFooter from "@/features/stock/components/StockDocumentDrawerFooter";
import { fetchSupplierNames } from "@/features/suppliers/api/suppliers.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useResourceAccess } from "@/lib/permissions";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import {
  dayjsDatePattern,
  formatTenantDate,
  formatTenantDateTime,
  formatTenantMoney,
} from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { DeleteOutlined, DownOutlined } from "@ant-design/icons";
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
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

const FIELDS = [
  "selling_price",
  "cost_price",
  "takeaway_price",
  "dine_in_price",
  "delivery_price",
  "price_list_price",
].filter(isShownPriceField);
const RULES = ["percent", "amount", "margin"];
const ROUNDINGS = [
  { value: "none", labelKey: "roundingNone" },
  { value: "0.05", labelKey: "rounding005" },
  { value: "0.25", labelKey: "rounding025" },
  { value: "0.99", labelKey: "rounding099" },
];
const STATUS_COLOR = {
  draft: "default",
  scheduled: "gold",
  applied: "green",
  cancelled: "default",
};
const BULK_DEFAULTS = {
  field: "selling_price",
  rule: "percent",
  value: 5,
  rounding: "none",
};

/** Same price on the same item / unit / field / list is one line. */
const lineKey = (line) =>
  [
    line.item_id,
    line.item_uom_id,
    line.field,
    line.price_list_id ?? "",
    line.min_quantity ?? "",
  ].join("|");

/** @param {Record<string, any>} line */
function isBelowCost(line) {
  if (
    line.field === "cost_price" ||
    line.cost == null ||
    line.new_value == null ||
    line.new_value === ""
  )
    return false;
  return Number(line.new_value) < Number(line.cost);
}

/** @param {unknown} rows */
function nameOptions(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    value: row.id ?? row.value,
    label:
      [row.code ?? row.item_code, row.name].filter(Boolean).join(" — ") ||
      String(row.id),
  }));
}

/**
 * Price change document: a batch of new prices applied now, or on its effective date.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; documentId: string | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function PriceChangeDrawer({
  open,
  mode,
  documentId,
  onClose,
  onCreated,
}) {
  const t = useTranslations("PriceChanges");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("price_changes");
  const { settings } = useCompanySettings();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [lines, setLines] = useState(/** @type {Record<string, any>[]} */ ([]));
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const [dirty, setDirty] = useState(false);
  const [pickedItems, setPickedItems] = useState(/** @type {string[]} */ ([]));
  const id = documentId ?? savedId;
  const creating = id == null;

  const detail = useQuery({
    queryKey: [...PRICE_CHANGES_QUERY_KEY, "detail", id],
    queryFn: () => fetchPriceChange(String(id)),
    enabled: open && !creating,
  });
  const record = /** @type {Record<string, any> | null} */ (
    detail.data && typeof detail.data === "object" ? detail.data : null
  );
  const status = record?.status ?? "draft";
  const readOnly =
    mode === "view" ||
    status !== "draft" ||
    (creating ? !access.canAdd : !access.canEdit);
  const effectiveDate = Form.useWatch("effective_date", form);
  const bulkRule = Form.useWatch("rule", bulkForm);
  const bulkField = Form.useWatch("field", bulkForm);

  // Fill once per opening (or after a refetch of the saved document).
  const loadedFor = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (creating) {
      if (loadedFor.current !== "create") {
        loadedFor.current = "create";
        form.setFieldsValue({ effective_date: dayjs(), notes: "" });
        bulkForm.setFieldsValue(BULK_DEFAULTS);
        setLines([]);
        setPickedItems([]);
        setDirty(false);
      }
      return;
    }
    const stamp = `${id}:${detail.dataUpdatedAt}`;
    if (record && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.setFieldsValue({
        effective_date: record.effective_date
          ? dayjs(record.effective_date)
          : dayjs(),
        notes: record.notes ?? "",
      });
      // The "change prices" form only exists while editing; it starts from its defaults when shown.
      if (!readOnly) bulkForm.setFieldsValue(BULK_DEFAULTS);
      setLines(Array.isArray(record.lines) ? record.lines : []);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creating, id, record, detail.dataUpdatedAt, form, bulkForm]);

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

  const enabled = open && !readOnly;
  const categories = useQuery({
    queryKey: ["tenant", "categories", "names"],
    queryFn: fetchCategoryNames,
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const brands = useQuery({
    queryKey: ["tenant", "brands", "names"],
    queryFn: fetchBrandNames,
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const suppliers = useQuery({
    queryKey: ["tenant", "suppliers", "names"],
    queryFn: fetchSupplierNames,
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const priceLists = useQuery({
    queryKey: ["tenant", "price-lists", "names"],
    queryFn: fetchPriceListNames,
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const items = useQuery({
    queryKey: ["tenant", "items", "names"],
    queryFn: fetchItemNames,
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const refresh = (row) => {
    invalidateTenantListQueries(queryClient, PRICE_CHANGES_QUERY_KEY);
    if (row?.id)
      queryClient.setQueryData(
        [...PRICE_CHANGES_QUERY_KEY, "detail", String(row.id)],
        row,
      );
  };
  /** Below-cost refusals list the items, so the user knows which prices to fix. */
  const onError = (error) => {
    const rows = error?.response?.data?.data?.below_cost;
    const names = Array.isArray(rows)
      ? rows
          .map((row) => row.item_code || row.item_name)
          .filter(Boolean)
          .join(", ")
      : "";
    notification.error({
      title: t("actionError"),
      description: names
        ? `${getLocalizedApiErrorMessage(tApiErrors, error)} (${names})`
        : getLocalizedApiErrorMessage(tApiErrors, error),
    });
  };

  const payload = () => {
    const header = form.getFieldsValue(true);
    return {
      effective_date: header.effective_date
        ? dayjs(header.effective_date).format("YYYY-MM-DD")
        : null,
      notes: String(header.notes ?? "").trim() || null,
      lines: lines.map((line) => ({
        item_id: line.item_id,
        item_uom_id: line.item_uom_id,
        price_list_id: line.price_list_id ?? null,
        min_quantity: line.min_quantity ?? null,
        field: line.field,
        new_value: line.new_value,
      })),
    };
  };
  const persist = async () => {
    await form.validateFields();
    const row = creating
      ? await createPriceChange(payload())
      : await updatePriceChange(String(id), payload());
    if (creating && row?.id) {
      setSavedId(String(row.id));
      onCreated?.(row);
    }
    setDirty(false);
    refresh(row);
    return row;
  };

  const save = useMutation({
    mutationFn: persist,
    onSuccess: () => message.success(t("saved")),
    onError,
  });
  const apply = useMutation({
    mutationFn: async () => {
      const saved = dirty || creating ? await persist() : record;
      return applyPriceChange(String(saved?.id ?? id));
    },
    onSuccess: (row) => {
      refresh(row?.document ?? row);
      const result = row?.document ?? row;
      message.success(
        result?.status === "scheduled" ? t("scheduled") : t("applied"),
      );
      queryClient.invalidateQueries({ queryKey: ["tenant", "items"] });
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: () => cancelPriceChange(String(id)),
    onSuccess: (row) => {
      refresh(row);
      message.success(t("cancelled"));
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => deletePriceChange(String(id)),
    onSuccess: () => {
      message.success(t("deleted"));
      invalidateTenantListQueries(queryClient, PRICE_CHANGES_QUERY_KEY);
      forceClose();
    },
    onError,
  });

  /** Adds or replaces lines (same item / unit / field / list) without touching the others. */
  const mergeLines = (incoming) => {
    const byKey = new Map(lines.map((line) => [lineKey(line), line]));
    incoming.forEach((line) => byKey.set(lineKey(line), line));
    setLines([...byKey.values()]);
    setDirty(true);
  };
  const fill = useMutation({
    /** @param {Record<string, unknown>} extra */
    mutationFn: (extra) =>
      bulkForm.validateFields().then((values) =>
        previewPriceChangeBulk({
          ...values,
          value: values.value ?? 0,
          ...extra,
        }),
      ),
    onSuccess: (result) => {
      const rows = Array.isArray(result?.lines) ? result.lines : [];
      mergeLines(rows);
      setPickedItems([]);
      message.success(t("filled", { count: rows.length }));
    },
    onError,
  });

  const busy =
    save.isPending || apply.isPending || cancel.isPending || remove.isPending;
  const scheduleMode =
    effectiveDate != null &&
    dayjs(effectiveDate).startOf("day").isAfter(dayjs().startOf("day"));
  const belowCount = lines.filter(isBelowCost).length;
  const currencyMark = settings.primaryCurrencySymbol ?? "";

  const confirmApply = () =>
    modal.confirm({
      title: scheduleMode ? t("scheduleConfirmTitle") : t("applyConfirmTitle"),
      content: scheduleMode
        ? t("scheduleConfirmContent", {
            count: lines.length,
            date: formatTenantDate(dayjs(effectiveDate).format("YYYY-MM-DD")),
          })
        : t("applyConfirmContent", { count: lines.length }),
      okText: scheduleMode ? t("schedule") : t("apply"),
      cancelText: t("cancel"),
      onOk: () => apply.mutateAsync().catch(() => {}),
    });
  const confirmCancelDoc = () =>
    modal.confirm({
      title: t("cancelConfirmTitle"),
      content: t("cancelConfirmContent"),
      okText: t("cancelDoc"),
      okButtonProps: { danger: true },
      cancelText: t("cancel"),
      onOk: () => cancel.mutateAsync().catch(() => {}),
    });

  const columns = [
    {
      title: t("colItem"),
      key: "item",
      render: (_, row) => (
        <div className="min-w-0">
          <div className="truncate">
            {[row.item_code, row.item_name].filter(Boolean).join(" — ") ||
              row.item_id}
          </div>
          {isBelowCost(row) ? (
            <Tag color="red" className="!mt-0.5">
              {t("belowCostTag")}
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: t("colUnit"),
      dataIndex: "uom",
      width: 80,
      render: (value) => value || "—",
    },
    {
      title: t("colField"),
      dataIndex: "field",
      width: 150,
      render: (value, row) =>
        value === "price_list_price" && row.price_list
          ? `${t(`field_${value}`)} · ${row.price_list}`
          : t(`field_${value}`),
    },
    {
      title: t("colOld"),
      dataIndex: "old_value",
      width: 110,
      align: "right",
      render: (value) => (value != null ? formatTenantMoney(value) : "—"),
    },
    {
      title: t("colNew"),
      dataIndex: "new_value",
      width: 150,
      render: (value, row, index) =>
        readOnly ? (
          <strong>{value != null ? formatTenantMoney(value) : "—"}</strong>
        ) : (
          <TenantNumberInput
            kind="money"
            min={0}
            style={{ width: "100%" }}
            status={isBelowCost(row) ? "error" : undefined}
            value={value != null && value !== "" ? Number(value) : null}
            onChange={(next) => {
              setLines((current) =>
                current.map((line, i) =>
                  i === index ? { ...line, new_value: next } : line,
                ),
              );
              setDirty(true);
            }}
          />
        ),
    },
    {
      title: t("colChange"),
      key: "change",
      width: 90,
      align: "right",
      render: (_, row) => {
        const before = Number(row.old_value);
        const after = Number(row.new_value);
        if (!Number.isFinite(before) || before === 0 || !Number.isFinite(after))
          return "—";
        const pct = ((after - before) / before) * 100;
        return (
          <Typography.Text
            type={pct < 0 ? "danger" : pct > 0 ? "success" : undefined}
          >{`${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}</Typography.Text>
        );
      },
    },
    {
      title: t("colCost"),
      dataIndex: "cost",
      width: 100,
      align: "right",
      render: (value) => (value != null ? formatTenantMoney(value) : "—"),
    },
    {
      title: t("colMargin"),
      key: "margin",
      width: 90,
      align: "right",
      render: (_, row) => {
        const price = Number(row.new_value);
        const cost = Number(row.cost);
        if (
          row.cost == null ||
          !Number.isFinite(price) ||
          price === 0 ||
          !Number.isFinite(cost)
        )
          return "—";
        return `${(((price - cost) / price) * 100).toFixed(1)}%`;
      },
    },
    ...(!readOnly
      ? [
          {
            title: "",
            key: "remove",
            width: 48,
            render: (_, _row, index) => (
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t("removeLine")}
                onClick={() => {
                  setLines((current) => current.filter((_, i) => i !== index));
                  setDirty(true);
                }}
              />
            ),
          },
        ]
      : []),
  ];

  const viewActions =
    record &&
    (status === "draft" || status === "scheduled") &&
    access.canEdit ? (
      <Dropdown
        trigger={["click"]}
        disabled={busy}
        menu={{
          items: [{ key: "cancel", label: t("cancelDoc"), danger: true }],
          onClick: confirmCancelDoc,
        }}
      >
        <Button disabled={busy}>
          {t("actionMore")} <DownOutlined />
        </Button>
      </Dropdown>
    ) : null;

  return (
    <ResourceCrudDrawer
      title={creating ? t("drawerCreate") : record?.number || t("drawerTitle")}
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
      size={1150}
      footer={
        <StockDocumentDrawerFooter
          // Applied documents show who applied them and when, like posted invoices.
          meta={
            status === "applied" ? (
              <div className="sales-invoice-drawer-footer-posted">
                <span className="sales-invoice-drawer-footer-posted-item">
                  <span className="sales-invoice-drawer-footer-posted-label">
                    {t("appliedBy")}
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-value">
                    {record?.applied_by_user?.name || "—"}
                  </span>
                </span>
                <span className="sales-invoice-drawer-footer-posted-item">
                  <span className="sales-invoice-drawer-footer-posted-label">
                    {t("appliedOn")}
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-value">
                    {formatTenantDateTime(record?.applied_at) || "—"}
                  </span>
                </span>
              </div>
            ) : null
          }
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={busy}
          // Apply first saves the draft; keep Delete / More hidden until it has finished.
          showDelete={
            !creating &&
            status === "draft" &&
            access.canDelete &&
            !apply.isPending
          }
          onDelete={() =>
            modal.confirm({
              title: t("deleteConfirm"),
              okText: t("delete"),
              okButtonProps: { danger: true },
              cancelText: t("cancel"),
              onOk: () => remove.mutateAsync().catch(() => {}),
            })
          }
          saveLabel={t("saveDraft")}
          onSave={() => save.mutate()}
          showPrimary={access.canEdit}
          primaryDisabled={lines.length === 0}
          primaryLabel={scheduleMode ? t("schedule") : t("apply")}
          onPrimary={confirmApply}
          startExtras={
            !creating && !dirty && !apply.isPending ? viewActions : null
          }
          readOnlyExtras={viewActions}
        />
      }
    >
      {status === "scheduled" && record ? (
        <Alert
          type="info"
          showIcon
          className="!mb-4"
          title={t("scheduledInfo", {
            date: formatTenantDate(record.effective_date),
          })}
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        disabled={readOnly}
        requiredMark={readOnly ? false : "optional"}
        onValuesChange={() => setDirty(true)}
      >
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-[220px_minmax(0,420px)]">
          <Form.Item
            name="effective_date"
            label={t("effectiveDate")}
            tooltip={t("effectiveDateHelp")}
            rules={[
              {
                required: true,
                message: t("fieldRequired", { field: t("effectiveDate") }),
              },
            ]}
          >
            <DatePicker
              className="w-full"
              format={dayjsDatePattern()}
              allowClear={false}
            />
          </Form.Item>
          <Form.Item name="notes" label={t("reason")} tooltip={t("reasonHelp")}>
            <Input maxLength={500} placeholder={t("reasonPlaceholder")} />
          </Form.Item>
        </div>
      </Form>

      {!readOnly ? (
        <>
          <Divider className="!mb-6 !mt-0" />
          <section>
            <ResourceDrawerPanelHeader
              title={t("sectionFill")}
              help={t("sectionFillHelp")}
            />
            <Form
              form={bulkForm}
              layout="vertical"
              disabled={busy}
              initialValues={BULK_DEFAULTS}
            >
              <div className="rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 pt-4">
                <Typography.Text strong className="mb-2 block">
                  {t("whichItems")}
                </Typography.Text>
                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-4">
                  <Form.Item name="category_id" label={t("filterCategory")}>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={t("all")}
                      options={nameOptions(categories.data)}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                  <Form.Item name="brand_id" label={t("filterBrand")}>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={t("all")}
                      options={nameOptions(brands.data)}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                  <Form.Item name="supplier_id" label={t("filterSupplier")}>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={t("all")}
                      options={nameOptions(suppliers.data)}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                  <Form.Item
                    name="price_list_id"
                    label={t("filterPriceList")}
                    rules={
                      bulkField === "price_list_price"
                        ? [
                            {
                              required: true,
                              message: t("fieldRequired", {
                                field: t("filterPriceList"),
                              }),
                            },
                          ]
                        : []
                    }
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={t("none")}
                      options={nameOptions(priceLists.data)}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                </div>
                <Typography.Text strong className="mb-2 block">
                  {t("howToChange")}
                </Typography.Text>
                <div className="grid grid-cols-1 items-end gap-x-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <Form.Item name="field" label={t("colField")}>
                    <Select
                      options={FIELDS.map((field) => ({
                        value: field,
                        label: t(`field_${field}`),
                      }))}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                  <Form.Item
                    name="rule"
                    label={t("rule")}
                    tooltip={t("ruleHelp")}
                  >
                    <Select
                      options={RULES.map((rule) => ({
                        value: rule,
                        label: t(`rule_${rule}`),
                      }))}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                  <Form.Item name="value" label={t("value")}>
                    <TenantNumberInput
                      kind={bulkRule === "amount" ? "money" : "percent"}
                      style={{ width: "100%" }}
                      addonAfter={
                        bulkRule === "amount" ? currencyMark || undefined : "%"
                      }
                    />
                  </Form.Item>
                  <Form.Item name="rounding" label={t("rounding")}>
                    <Select
                      options={ROUNDINGS.map((r) => ({
                        value: r.value,
                        label: t(r.labelKey),
                      }))}
                      getPopupContainer={drawerSelectGetPopup}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      ghost
                      loading={fill.isPending && pickedItems.length === 0}
                      onClick={() => fill.mutate({})}
                    >
                      {t("fill")}
                    </Button>
                  </Form.Item>
                </div>
              </div>
            </Form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                className="min-w-0 flex-1"
                placeholder={t("pickItems")}
                value={pickedItems}
                onChange={setPickedItems}
                options={nameOptions(items.data)}
                loading={items.isPending}
                maxTagCount="responsive"
                getPopupContainer={drawerSelectGetPopup}
              />
              <Button
                disabled={pickedItems.length === 0}
                loading={fill.isPending && pickedItems.length > 0}
                onClick={() =>
                  fill.mutate({
                    item_ids: pickedItems,
                    category_id: null,
                    brand_id: null,
                    supplier_id: null,
                  })
                }
              >
                {t("addItems")}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      <Divider className="!mb-6 !mt-6" />

      <section>
        <ResourceDrawerPanelHeader
          title={t("sectionPrices", { count: lines.length })}
          actions={
            !readOnly && lines.length > 0 ? (
              <Button
                size="small"
                onClick={() => {
                  setLines([]);
                  setDirty(true);
                }}
              >
                {t("clearLines")}
              </Button>
            ) : null
          }
        />
        {belowCount > 0 ? (
          <Alert
            type="warning"
            showIcon
            className="!mb-3"
            title={t("belowCostWarning", { count: belowCount })}
          />
        ) : null}
        <Table
          size="small"
          rowKey={(row) => String(row.id ?? lineKey(row))}
          columns={columns}
          dataSource={lines}
          pagination={
            lines.length > 50 ? { pageSize: 50, showSizeChanger: false } : false
          }
          locale={{ emptyText: t("emptyLines") }}
          rowClassName={(row) =>
            isBelowCost(row) ? "bg-red-50 dark:bg-red-950/40" : ""
          }
        />
      </section>
    </ResourceCrudDrawer>
  );
}
