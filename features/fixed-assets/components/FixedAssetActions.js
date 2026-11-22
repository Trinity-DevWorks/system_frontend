"use client";

import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import { fetchCustomerNames } from "@/features/customers/api/customers.api";
import {
  activateFixedAsset,
  changeFixedAssetEstimate,
  disposeFixedAsset,
  downloadFixedAssetPdf,
  fetchFixedAsset,
  reverseFixedAssetDisposal,
} from "@/features/fixed-assets/api/fixedAssets.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Descriptions, Empty, Form, InputNumber, Modal, Select, Spin, Table, Tabs, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const QUERY_KEY = /** @type {const} */ (["tenant", "fixed-assets"]);
const DISPOSAL_MODES = ["scrap", "sale_on_account", "sale_cash"];

/** False while rendering on the server, true in the browser (avoids hydration mismatches). */
const subscribeNoop = () => () => {};

/** @param {unknown} value */
const monthLabel = (value) => (value ? dayjs(String(value)).format("MM/YYYY") : "—");

/** @typedef {"history" | "source" | "estimate" | "dispose"} AssetDialog */

/**
 * Fixed asset actions shared by the list (row menu) and the asset drawer (header menu):
 * depreciation and source dialogs, change estimate, dispose, and reverse disposal.
 *
 * Usage: `const actions = useFixedAssetActions();` then `actions.menuItems(asset)` for a dropdown,
 * and render `actions.dialogs` once.
 */
export function useFixedAssetActions() {
  const t = useTranslations("FixedAssets");
  const tApiErrors = useTranslations("ApiErrors");
  const access = useResourceAccess("fixed_assets");
  const { settings } = useCompanySettings();
  const { notification, message, modal } = App.useApp();
  const { openStackedDrawer } = useGlobalDrawer();
  const queryClient = useQueryClient();
  const [estimateForm] = Form.useForm();
  const [disposeForm] = Form.useForm();
  const inBrowser = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [dialog, setDialog] = useState(/** @type {{ kind: AssetDialog; id: string; initial?: Record<string, unknown> } | null} */ (null));
  const disposalMode = Form.useWatch("mode", disposeForm);
  const required = (label) => [{ required: true, message: t("fieldRequired", { field: label }) }];
  const money = (value) => (value == null ? "—" : formatTenantMoneyWithSymbol(value, settings.primaryCurrencySymbol ?? ""));

  const assetId = dialog?.id ?? null;
  const detail = useQuery({
    queryKey: [...QUERY_KEY, "detail", assetId],
    queryFn: () => fetchFixedAsset(String(assetId)),
    enabled: assetId != null,
  });
  const asset = /** @type {Record<string, any> | null} */ (detail.data && typeof detail.data === "object" ? detail.data : null);
  const disposeOpen = dialog?.kind === "dispose";
  const customers = useQuery({ queryKey: ["tenant", "customers", "names"], queryFn: fetchCustomerNames, enabled: disposeOpen });
  const cashAccounts = useQuery({ queryKey: ["tenant", "cash-bank-accounts", "names"], queryFn: fetchCashBankAccountNames, enabled: disposeOpen });

  const close = () => setDialog(null);
  const refresh = (id, record) => {
    invalidateTenantListQueries(queryClient, QUERY_KEY);
    if (record && typeof record === "object") queryClient.setQueryData([...QUERY_KEY, "detail", id], record);
    else queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "detail", id] });
  };
  const onError = (error) => notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });

  const estimate = useMutation({
    mutationFn: ({ id, values }) => changeFixedAssetEstimate(id, values),
    onSuccess: (record, { id }) => {
      message.success(t("estimateSaved"));
      close();
      refresh(id, record);
    },
    onError,
  });
  const dispose = useMutation({
    mutationFn: ({ id, values }) =>
      disposeFixedAsset(id, {
        ...values,
        amount: values.mode === "scrap" ? 0 : values.amount,
        date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : undefined,
      }),
    onSuccess: (record, { id }) => {
      message.success(t("disposedOk"));
      close();
      refresh(id, record);
    },
    onError,
  });
  const reverse = useMutation({
    mutationFn: (id) => reverseFixedAssetDisposal(id),
    onSuccess: (record, id) => {
      message.success(t("reversed"));
      refresh(id, record);
    },
    onError,
  });
  const activate = useMutation({
    mutationFn: (id) => activateFixedAsset(id),
    onSuccess: (record, id) => {
      message.success(t("activated"));
      refresh(id, record);
    },
    onError,
  });
  const { downloadPdf, printPdf, isPending: pdfBusy } = useDocumentPdfDownload({ download: downloadFixedAssetPdf, errorTitle: t("pdfError") });
  const busy = estimate.isPending || dispose.isPending || reverse.isPending || activate.isPending || pdfBusy;

  /** @param {Record<string, any>} record */
  const confirmActivate = (record) =>
    modal.confirm({
      title: t("activateConfirmTitle"),
      content: t("activateConfirmContent"),
      okText: t("activate"),
      cancelText: t("cancel"),
      onOk: () => activate.mutateAsync(String(record.id)).catch(() => {}),
    });

  // Fill a dialog once it is open (its form exists only then). No forceRender on the
  // modals: a mounted hidden modal would take the Esc key from the drawer behind it.
  useEffect(() => {
    if (dialog?.kind === "estimate") {
      estimateForm.resetFields();
      estimateForm.setFieldsValue(dialog.initial ?? {});
    } else if (dialog?.kind === "dispose") {
      disposeForm.resetFields();
      disposeForm.setFieldsValue(dialog.initial ?? {});
    }
  }, [dialog, estimateForm, disposeForm]);

  /** @param {Record<string, any>} record */
  const openEstimate = (record) => {
    const id = String(record.id);
    setDialog({
      kind: "estimate",
      id,
      initial: {
        useful_life_months: record?.useful_life_months != null ? Number(record.useful_life_months) : undefined,
        salvage_value: record?.salvage_value != null ? Number(record.salvage_value) : 0,
      },
    });
    // List rows do not carry the life / salvage, so fill from the full asset once it is loaded.
    if (record.useful_life_months == null) {
      queryClient
        .fetchQuery({ queryKey: [...QUERY_KEY, "detail", id], queryFn: () => fetchFixedAsset(id) })
        .then((full) =>
          // Next tick: the dialog (and its form) is open by then, even when the asset came from cache.
          window.setTimeout(() => {
            // Only fill what is still empty, so nothing the user typed meanwhile is overwritten.
            if (estimateForm.getFieldValue("useful_life_months") == null && full?.useful_life_months != null) {
              estimateForm.setFieldsValue({
                useful_life_months: Number(full.useful_life_months),
                salvage_value: full.salvage_value != null ? Number(full.salvage_value) : 0,
              });
            }
          }, 0),
        )
        .catch(onError);
    }
  };
  /** @param {Record<string, any>} record */
  const openDispose = (record) => {
    setDialog({ kind: "dispose", id: String(record.id), initial: { mode: "scrap", amount: 0, date: dayjs() } });
  };
  /** @param {Record<string, any>} record */
  const confirmReverse = (record) =>
    modal.confirm({
      title: t("reverseConfirmTitle"),
      content: t("reverseConfirmContent"),
      okText: t("reverse"),
      okButtonProps: { danger: true },
      cancelText: t("cancel"),
      onOk: () => reverse.mutateAsync(String(record.id)).catch(() => {}),
    });

  /**
   * Menu items for one asset: Activate (drafts), Depreciation, Source, the life-cycle actions its
   * status allows, then Print and Download PDF.
   *
   * @param {Record<string, any> | null | undefined} record
   */
  const menuItems = useCallback(
    (record) => {
      if (!record?.id) return [];
      const status = String(record.status ?? "draft");
      const id = String(record.id);
      const view = [
        access.canEdit && status === "draft" ? { key: "activate", label: t("activate"), disabled: busy, onClick: () => confirmActivate(record) } : null,
        { key: "history", label: t("depreciation"), onClick: () => setDialog({ kind: "history", id }) },
        { key: "source", label: t("source"), onClick: () => setDialog({ kind: "source", id }) },
      ].filter(Boolean);
      const lifecycle = [
        access.canEdit && status === "active" ? { key: "estimate", label: t("estimate"), disabled: busy, onClick: () => openEstimate(record) } : null,
        access.canEdit && (status === "active" || status === "fully_depreciated")
          ? { key: "dispose", label: t("dispose"), danger: true, disabled: busy, onClick: () => openDispose(record) }
          : null,
        access.canReverse && status === "disposed" ? { key: "reverse", label: t("reverse"), disabled: busy, onClick: () => confirmReverse(record) } : null,
      ].filter(Boolean);
      const print = access.canPrint
        ? [
            { key: "print", label: t("actionPrint"), onClick: () => printPdf(id, record.asset_number) },
            { key: "pdf", label: t("actionDownloadPdf"), onClick: () => downloadPdf(id, record.asset_number) },
          ]
        : [];
      return [view, lifecycle, print]
        .filter((group) => group.length > 0)
        .flatMap((group, index) => (index === 0 ? group : [{ type: "divider", key: `asset-divider-${index}` }, ...group]));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, access.canEdit, access.canReverse, access.canPrint, busy],
  );

  const scheduleColumns = [
    { title: t("month"), dataIndex: "month", key: "month", render: monthLabel },
    { title: t("amount"), dataIndex: "amount", key: "amount", align: "right", render: money },
    { title: t("bookValue"), dataIndex: "book_value_after", key: "book_value_after", align: "right", render: money },
  ];
  const titleSuffix = asset?.asset_number || asset?.name || "";
  const loading = detail.isPending ? (
    <div className="flex min-h-32 items-center justify-center">
      <Spin />
    </div>
  ) : null;

  const historyBody = asset ? (
    <Tabs
      items={[
        {
          key: "posted",
          label: t("historyTitle"),
          children: (
            <Table size="small" pagination={{ pageSize: 12, showSizeChanger: false, hideOnSinglePage: true }} rowKey={(row) => `${row.month}-${row.run_id}`} dataSource={asset.history ?? []} columns={scheduleColumns} locale={{ emptyText: t("noHistory") }} />
          ),
        },
        {
          key: "coming",
          label: t("scheduleTitle"),
          children: (
            <Table size="small" pagination={{ pageSize: 12, showSizeChanger: false, hideOnSinglePage: true }} rowKey="month" dataSource={asset.schedule ?? []} columns={scheduleColumns} locale={{ emptyText: t("noSchedule") }} />
          ),
        },
      ]}
    />
  ) : (
    loading
  );

  const source = asset?.source;
  const sourceBody = !asset ? (
    loading
  ) : source?.purchase_invoice_id ? (
    <Descriptions size="small" column={1} bordered>
      <Descriptions.Item label={t("invoice")}>
        <Button
          type="link"
          className="!px-0"
          onClick={() => {
            close();
            openStackedDrawer({ featureId: "purchaseInvoices", id: String(source.purchase_invoice_id), mode: "view" });
          }}
        >
          {source.invoice_number ?? source.purchase_invoice_id}
        </Button>
      </Descriptions.Item>
      {asset.supplier ? <Descriptions.Item label={t("supplier")}>{asset.supplier.name}</Descriptions.Item> : null}
      {asset.item ? <Descriptions.Item label={t("item")}>{[asset.item.item_code, asset.item.name].filter(Boolean).join(" — ")}</Descriptions.Item> : null}
    </Descriptions>
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("manualSource")} />
  );

  const closeFooter = <Button onClick={close}>{t("close")}</Button>;

  const dialogs = !inBrowser ? null : (
    <>
      <Modal open={dialog?.kind === "history"} title={`${t("depreciation")} · ${titleSuffix}`} width={760} footer={closeFooter} onCancel={close}>
        {historyBody}
      </Modal>

      <Modal open={dialog?.kind === "source"} title={`${t("source")} · ${titleSuffix}`} footer={closeFooter} onCancel={close}>
        {sourceBody}
      </Modal>

      <Modal
        open={dialog?.kind === "estimate"}
        title={`${t("estimate")} · ${titleSuffix}`}
        okText={t("save")}
        cancelText={t("cancel")}
        confirmLoading={estimate.isPending}
        onCancel={close}
        onOk={() => estimateForm.submit()}
      >
        <Typography.Paragraph type="secondary">{t("estimateHelp")}</Typography.Paragraph>
        <Form form={estimateForm} layout="vertical" onFinish={(values) => assetId && estimate.mutate({ id: assetId, values })}>
          <Form.Item name="useful_life_months" label={t("life")} rules={required(t("life"))}>
            <InputNumber min={1} max={1200} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="salvage_value" label={t("salvage")} rules={required(t("salvage"))}>
            <TenantNumberInput kind="money" min={0} className="w-full" addonAfter={settings.primaryCurrencySymbol || undefined} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={disposeOpen}
        title={`${t("dispose")} · ${titleSuffix}`}
        okText={t("dispose")}
        okButtonProps={{ danger: true }}
        cancelText={t("cancel")}
        confirmLoading={dispose.isPending}
        onCancel={close}
        onOk={() => disposeForm.submit()}
      >
        <Typography.Paragraph type="secondary">{t("disposeHelp")}</Typography.Paragraph>
        <Form form={disposeForm} layout="vertical" onFinish={(values) => assetId && dispose.mutate({ id: assetId, values })}>
          <Form.Item name="date" label={t("date")} rules={required(t("date"))}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="mode" label={t("disposalMode")} rules={required(t("disposalMode"))}>
            <Select options={DISPOSAL_MODES.map((value) => ({ value, label: t(value) }))} />
          </Form.Item>
          {disposalMode && disposalMode !== "scrap" ? (
            <Form.Item name="amount" label={t("saleAmount")} rules={required(t("saleAmount"))}>
              <TenantNumberInput kind="money" min={0} className="w-full" addonAfter={settings.primaryCurrencySymbol || undefined} />
            </Form.Item>
          ) : null}
          {disposalMode === "sale_on_account" ? (
            <Form.Item name="customer_id" label={t("customer")} rules={required(t("customer"))}>
              <Select
                showSearch
                optionFilterProp="label"
                loading={customers.isPending}
                options={(Array.isArray(customers.data) ? customers.data : []).map((row) => ({ value: String(row.id), label: row.name }))}
              />
            </Form.Item>
          ) : null}
          {disposalMode === "sale_cash" ? (
            <Form.Item name="cash_bank_account_id" label={t("cashAccount")} rules={required(t("cashAccount"))}>
              <Select
                loading={cashAccounts.isPending}
                options={(Array.isArray(cashAccounts.data) ? cashAccounts.data : []).map((row) => ({ value: Number(row.id), label: row.name }))}
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </>
  );

  return { menuItems, dialogs, busy };
}
