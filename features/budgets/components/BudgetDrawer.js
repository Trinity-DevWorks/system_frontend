"use client";

import { useReportBranch } from "@/features/accounting/useReportBranch";
import StockDocumentDrawerFooter from "@/features/stock/components/StockDocumentDrawerFooter";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useCompanySettings } from "@/lib/company-settings";
import { formatTenantDateTime } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import {
  DownOutlined,
  DownloadOutlined,
  ExportOutlined,
  FileExcelOutlined,
  ImportOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
} from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUDGETS_QUERY_KEY,
  approveBudget,
  archiveBudget,
  budgetDetailQueryKey,
  budgetGridQueryKey,
  copyBudgetActuals,
  copyBudgetFrom,
  createBudget,
  deleteBudget,
  downloadBudget,
  fetchBudget,
  fetchBudgetGrid,
  fetchBudgets,
  importBudget,
  reviseBudget,
  saveBudgetLines,
  updateBudget,
} from "../api/budgets.api";
import BudgetGrid from "./BudgetGrid";

const STATUS_COLOR = {
  draft: "default",
  approved: "green",
  archived: "default",
};

/** @typedef {{ type: "spread" | "percent" | "copyActuals" | "copyFrom"; row?: Record<string, any> }} BudgetDialog */

/**
 * Budget: header details and the accounts × months grid.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; budgetId: string | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function BudgetDrawer({
  open,
  mode,
  budgetId,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Budgets");
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const { message, notification, modal } = App.useApp();
  const access = useResourceAccess("budgets");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [dialogForm] = Form.useForm();
  const [savedId, setSavedId] = useState(/** @type {string | null} */ (null));
  const id = budgetId ?? savedId;
  const creating = id == null;
  // Existing budgets: name / year / applies to / notes in a dialog (More → Details).
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [edits, setEdits] = useState(
    /** @type {Record<string, number>} */ ({}),
  );
  const [headerDirty, setHeaderDirty] = useState(false);
  const [dialog, setDialog] = useState(
    /** @type {BudgetDialog | null} */ (null),
  );
  const [importErrors, setImportErrors] = useState(
    /** @type {Record<string, any>[]} */ ([]),
  );
  const required = (label) => [
    { required: true, message: t("fieldRequired", { field: label }) },
  ];

  const detail = useQuery({
    queryKey: budgetDetailQueryKey(id ?? "new"),
    queryFn: () => fetchBudget(String(id)),
    enabled: open && !creating,
  });
  const grid = useQuery({
    queryKey: budgetGridQueryKey(id ?? "new"),
    queryFn: () => fetchBudgetGrid(String(id)),
    enabled: open && !creating,
  });
  // "Applies to" lists the branches this user may use; hidden when there is only one.
  const { accessibleBranches } = useReportBranch(undefined);
  const otherBudgets = useQuery({
    queryKey: [...BUDGETS_QUERY_KEY, "options"],
    queryFn: () => fetchBudgets({ per_page: 100 }),
    enabled: open && dialog?.type === "copyFrom",
  });
  const record = /** @type {Record<string, any> | null} */ (
    detail.data && typeof detail.data === "object" ? detail.data : null
  );
  const status = record?.status ?? "draft";
  const readOnly =
    mode === "view" ||
    status !== "draft" ||
    (creating ? !access.canAdd : !access.canEdit);
  const dirty = (creating && headerDirty) || Object.keys(edits).length > 0;

  // Fill the header once per opening (or after a refetch of the saved budget).
  const loadedFor = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (creating) {
      if (loadedFor.current !== "create") {
        loadedFor.current = "create";
        form.setFieldsValue({
          name: "",
          year: dayjs().add(1, "year"),
          branch_id: undefined,
          notes: "",
        });
        setEdits({});
        setHeaderDirty(false);
      }
      return;
    }
    loadedFor.current = String(id);
  }, [open, creating, id, form]);

  // The details form lives in its dialog for a saved budget: fill it each time it opens.
  useEffect(() => {
    if (!detailsOpen || !record) return;
    form.resetFields();
    form.setFieldsValue({
      name: record.name ?? "",
      year: record.year ? dayjs(`${record.year}-01-01`) : null,
      branch_id: record.branch_id ?? undefined,
      notes: record.notes ?? "",
    });
  }, [detailsOpen, record, form]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: () => {
      setSavedId(null);
      setEdits({});
      setImportErrors([]);
      onClose();
    },
    shouldConfirmDiscard: () => dirty,
  });

  const refresh = () => {
    invalidateTenantListQueries(queryClient, BUDGETS_QUERY_KEY);
    if (id) {
      queryClient.invalidateQueries({ queryKey: budgetDetailQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: budgetGridQueryKey(id) });
    }
  };
  const onError = (error) =>
    notification.error({
      title: t("actionError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });

  /** @param {Record<string, any>} values */
  const headerFromValues = (values) => ({
    name: String(values.name ?? "").trim(),
    year: values.year ? dayjs(values.year).year() : undefined,
    branch_id: values.branch_id ?? null,
    notes: String(values.notes ?? "").trim() || null,
  });
  const saveDetails = useMutation({
    mutationFn: async () => {
      const header = headerFromValues(await form.validateFields());
      return updateBudget(String(id), {
        name: header.name,
        branch_id: header.branch_id,
        notes: header.notes,
      });
    },
    onSuccess: () => {
      message.success(t("saved"));
      setDetailsOpen(false);
      setHeaderDirty(false);
      refresh();
    },
    onError: (error) => (error?.errorFields ? null : onError(error)),
  });

  /** Saves the header (new budget) and the changed cells; returns the budget id. */
  const persist = async () => {
    let currentId = id;
    if (creating) {
      // New budget: the details card is filled first; saving it creates the draft and opens the grid.
      const header = headerFromValues(await form.validateFields());
      const created = await createBudget(header);
      currentId = String(created.id);
      setSavedId(currentId);
      onCreated?.(created);
    }
    const lines = Object.entries(edits).map(([key, amount]) => {
      const [accountId, month] = key.split("|");
      return { account_id: Number(accountId), period_month: month, amount };
    });
    if (lines.length && currentId)
      await saveBudgetLines(String(currentId), lines);
    setEdits({});
    setHeaderDirty(false);
    invalidateTenantListQueries(queryClient, BUDGETS_QUERY_KEY);
    if (currentId) {
      queryClient.invalidateQueries({
        queryKey: budgetDetailQueryKey(currentId),
      });
      queryClient.invalidateQueries({
        queryKey: budgetGridQueryKey(currentId),
      });
    }
    return String(currentId);
  };

  const save = useMutation({
    mutationFn: persist,
    onSuccess: () => {
      message.success(t("saved"));
    },
    onError: (error) => (error?.errorFields ? null : onError(error)),
  });
  const action = useMutation({
    /** @param {{ name: string; run: () => Promise<any> }} job */
    mutationFn: (job) => job.run(),
    onSuccess: (_data, job) => {
      message.success(t(`${job.name}Success`));
      if (job.name === "delete") {
        invalidateTenantListQueries(queryClient, BUDGETS_QUERY_KEY);
        forceClose();
        return;
      }
      setEdits({});
      setDialog(null);
      refresh();
    },
    onError,
  });
  const busy = save.isPending || action.isPending;

  const confirmRun = (name, run, danger = false) =>
    modal.confirm({
      title: t(`${name}Title`),
      content: t(`${name}Content`),
      okText: t(`action${name[0].toUpperCase()}${name.slice(1)}`),
      okButtonProps: danger ? { danger: true } : undefined,
      cancelText: t("cancel"),
      onOk: () => action.mutateAsync({ name, run }).catch(() => {}),
    });
  const onApprove = () =>
    modal.confirm({
      title: t("approveTitle"),
      content: t("approveContent"),
      okText: t("actionApprove"),
      cancelText: t("cancel"),
      onOk: () =>
        (dirty || creating ? persist() : Promise.resolve(String(id)))
          .then((savedBudgetId) =>
            action.mutateAsync({
              name: "approve",
              run: () => approveBudget(savedBudgetId),
            }),
          )
          .catch((error) => (error?.errorFields ? null : onError(error))),
    });

  const months = useMemo(
    () => (Array.isArray(grid.data?.months) ? grid.data.months : []),
    [grid.data],
  );
  const rows = useMemo(
    () =>
      Array.isArray(grid.data?.rows)
        ? grid.data.rows.filter(
            (row) => row.type === "revenue" || row.type === "expense",
          )
        : [],
    [grid.data],
  );
  const setCells = (accountId, values) =>
    setEdits((current) => {
      const next = { ...current };
      months.forEach((month, index) => {
        next[`${accountId}|${month}`] = values[index];
      });
      return next;
    });
  const rowValues = (row) =>
    months.map(
      (month) =>
        edits[`${row.account_id}|${month}`] ??
        Number(row.amounts?.[month] ?? 0),
    );

  const onRowAction = (kind, row) => {
    if (kind === "clear") {
      setCells(
        row.account_id,
        months.map(() => 0),
      );
      return;
    }
    setDialog({
      type: kind,
      row,
      initial:
        kind === "spread"
          ? { amount: rowValues(row).reduce((a, b) => a + b, 0) || null }
          : { percent: 10 },
    });
  };
  const openToolDialog = (type) => {
    if (dirty) {
      modal.warning({
        title: t("saveFirstTitle"),
        content: t("saveFirstContent"),
      });
      return;
    }
    setDialog({
      type,
      initial:
        type === "copyActuals"
          ? {
              year: dayjs(`${record?.year ?? dayjs().year()}-01-01`).subtract(
                1,
                "year",
              ),
              percent: 0,
            }
          : { percent: 0 },
    });
  };
  // Fill the dialog once it is open (its form exists only then). No forceRender on the
  // modal: a mounted hidden modal would take the Esc key from the drawer.
  useEffect(() => {
    if (!dialog) return;
    dialogForm.resetFields();
    dialogForm.setFieldsValue(dialog.initial ?? {});
  }, [dialog, dialogForm]);

  const submitDialog = () =>
    dialogForm
      .validateFields()
      .then((values) => {
        const current = dialog;
        if (!current) return null;
        if (current.type === "spread" && current.row) {
          // Equal months, the rounding left on the last one (same rule as the server).
          const total = Number(values.amount ?? 0);
          const monthly = Math.floor((total / 12) * 100) / 100;
          setCells(
            current.row.account_id,
            months.map((_, i) =>
              i === 11
                ? Math.round((total - monthly * 11) * 100) / 100
                : monthly,
            ),
          );
          setDialog(null);
          return null;
        }
        if (current.type === "percent" && current.row) {
          const factor = 1 + Number(values.percent ?? 0) / 100;
          setCells(
            current.row.account_id,
            rowValues(current.row).map(
              (v) => Math.round(v * factor * 100) / 100,
            ),
          );
          setDialog(null);
          return null;
        }
        if (current.type === "copyActuals") {
          return action.mutateAsync({
            name: "copyActuals",
            run: () =>
              copyBudgetActuals(String(id), {
                year: dayjs(values.year).year(),
                percent: values.percent ?? 0,
              }),
          });
        }
        return action.mutateAsync({
          name: "copyFrom",
          run: () =>
            copyBudgetFrom(String(id), {
              source_budget_id: values.source_budget_id,
              percent: values.percent ?? 0,
            }),
        });
      })
      .catch(() => {});

  const runImport = async (file) => {
    if (dirty) {
      modal.warning({
        title: t("saveFirstTitle"),
        content: t("saveFirstContent"),
      });
      return false;
    }
    setImportErrors([]);
    try {
      await importBudget(String(id), file);
      message.success(t("importSuccess"));
      refresh();
    } catch (error) {
      const rows = error?.response?.data?.details?.rows;
      if (Array.isArray(rows) && rows.length) setImportErrors(rows);
      else onError(error);
    }
    return false;
  };

  // One "Export / import" menu, like the table headers. Import / template only while the budget is a draft.
  const importFileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const canImportHere = !creating && !readOnly && access.canImport;
  const transferItems = [
    ...(access.canExport
      ? [
          {
            key: "export",
            icon: <FileExcelOutlined />,
            label: t("exportExcel"),
          },
        ]
      : []),
    ...(canImportHere
      ? [
          ...(access.canExport ? [{ type: "divider" }] : []),
          { key: "import", icon: <ImportOutlined />, label: t("importExcel") },
          ...(access.canExport
            ? [
                {
                  key: "template",
                  icon: <DownloadOutlined />,
                  label: t("downloadTemplate"),
                },
              ]
            : []),
        ]
      : []),
  ];
  const onTransfer = (key) => {
    if (key === "export") downloadBudget(String(id)).catch(onError);
    else if (key === "template")
      // Every account, to fill in Excel and bring back with Import.
      downloadBudget(String(id), { template: true }).catch(onError);
    else if (key === "import") importFileRef.current?.click();
  };
  const transferMenu =
    !creating && transferItems.length ? (
      <>
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          disabled={busy}
          menu={{
            items: transferItems,
            onClick: ({ key }) => onTransfer(String(key)),
          }}
        >
          <Button icon={<ExportOutlined />}>
            {canImportHere ? t("importExportMenu") : t("exportMenu")}
          </Button>
        </Dropdown>
        {canImportHere ? (
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) runImport(file);
            }}
          />
        ) : null}
      </>
    ) : null;

  const toolbar =
    !creating && !readOnly ? (
      <>
        <Dropdown
          trigger={["click"]}
          disabled={busy}
          menu={{
            items: [
              { key: "copyActuals", label: t("toolCopyActuals") },
              { key: "copyFrom", label: t("toolCopyFrom") },
            ],
            onClick: ({ key }) => openToolDialog(String(key)),
          }}
        >
          <Button>
            {t("toolFill")} <DownOutlined />
          </Button>
        </Dropdown>
        {transferMenu}
      </>
    ) : (
      transferMenu
    );

  const moreItems =
    status !== "draft" && status !== "archived" && access.canEdit
      ? [{ key: "archive", label: t("actionArchive"), danger: true }]
      : [];
  const onMore = (key) => {
    if (key === "archive")
      confirmRun("archive", () => archiveBudget(String(id)), true);
  };
  const moreMenu =
    record && !creating && moreItems.length ? (
      <Dropdown
        trigger={["click"]}
        disabled={busy}
        menu={{ items: moreItems, onClick: ({ key }) => onMore(String(key)) }}
      >
        <Button disabled={busy}>
          {t("actionMore")} <DownOutlined />
        </Button>
      </Dropdown>
    ) : null;
  const viewActions = record ? (
    <>
      {moreMenu}
      {access.canEdit && status === "approved" ? (
        <Button
          type="primary"
          disabled={busy}
          onClick={() => confirmRun("revise", () => reviseBudget(String(id)))}
        >
          {t("actionRevise")}
        </Button>
      ) : null}
    </>
  ) : null;

  const branchOptions = accessibleBranches.map((b) => ({
    value: Number(b.id),
    label: b.name,
  }));
  const title = creating
    ? t("drawerCreate")
    : [
        record?.name,
        record?.year,
        record?.version > 1 ? `v${record.version}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <ResourceCrudDrawer
      title={title || t("drawerTitle")}
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
      // Full screen from the top, like the invoice drawers.
      placement="top"
      size="100%"
      showExpand={false}
      // Name / year / applies to / notes of a saved budget open from the header.
      headerExtra={
        record && !creating ? (
          <Button
            icon={<InfoCircleOutlined />}
            onClick={() => setDetailsOpen(true)}
          >
            {t("tabDetails")}
          </Button>
        ) : null
      }
      footer={
        <StockDocumentDrawerFooter
          // Approved (and later archived) budgets show who approved them and when, like posted documents.
          meta={
            record?.approved_at ? (
              <div className="sales-invoice-drawer-footer-posted">
                <span className="sales-invoice-drawer-footer-posted-item">
                  <span className="sales-invoice-drawer-footer-posted-label">
                    {t("approvedBy")}
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-value">
                    {record.approved_by_name || "—"}
                  </span>
                </span>
                <span className="sales-invoice-drawer-footer-posted-item">
                  <span className="sales-invoice-drawer-footer-posted-label">
                    {t("approvedOn")}
                  </span>
                  <span className="sales-invoice-drawer-footer-posted-value">
                    {formatTenantDateTime(record.approved_at) || "—"}
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
          showDelete={!creating && status === "draft" && access.canDelete}
          deleteBesideCancel
          onDelete={() =>
            confirmRun("delete", () => deleteBudget(String(id)), true)
          }
          saveLabel={
            creating
              ? t("continue")
              : Object.keys(edits).length
                ? t("saveChanges", { count: Object.keys(edits).length })
                : t("drawerSave")
          }
          onSave={() => save.mutate()}
          // A new budget only has its details; Approve comes once the grid is filled.
          showPrimary={access.canEdit && !creating}
          startExtras={moreMenu}
          primaryLabel={t("actionApprove")}
          onPrimary={onApprove}
          readOnlyExtras={viewActions}
        />
      }
    >
      {status === "archived" ? (
        <Alert
          type="info"
          showIcon
          className="!mb-3"
          title={t("archivedInfo")}
        />
      ) : null}
      {importErrors.length ? (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setImportErrors([])}
          className="!mb-3"
          title={t("importErrors", { count: importErrors.length })}
          description={
            <ul className="!mb-0 ps-4">
              {importErrors.slice(0, 10).map((row) => (
                <li key={`${row.row}-${row.code}`}>
                  {t("importErrorRow", {
                    row: row.row,
                    code: row.code || "—",
                    message: row.message,
                  })}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}

      {creating ? (
        // New budget: fill the details first (Continue saves them), then the grid opens.
        <div className="flex justify-center py-6">
          <Card title={t("tabDetails")} className="w-full max-w-2xl">
            <Form
              form={form}
              layout="vertical"
              disabled={readOnly}
              requiredMark={readOnly ? false : "optional"}
              onValuesChange={() => setHeaderDirty(true)}
            >
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Form.Item
                  name="name"
                  label={t("fieldName")}
                  rules={required(t("fieldName"))}
                >
                  <Input maxLength={255} placeholder={t("namePlaceholder")} />
                </Form.Item>
                <Form.Item
                  name="year"
                  label={t("fieldYear")}
                  tooltip={t("yearHelp")}
                  rules={required(t("fieldYear"))}
                >
                  <DatePicker
                    picker="year"
                    className="w-full"
                    disabled={readOnly || !creating}
                  />
                </Form.Item>
              </div>
              {/* Empty = whole company. Only one branch: nothing to choose. */}
              {accessibleBranches.length > 1 ? (
                <Form.Item
                  name="branch_id"
                  label={t("fieldScope")}
                  tooltip={t("scopeHelp")}
                >
                  <Select
                    allowClear
                    placeholder={t("wholeCompany")}
                    options={branchOptions}
                    getPopupContainer={drawerSelectGetPopup}
                  />
                </Form.Item>
              ) : null}
              <Form.Item name="notes" label={t("fieldNotes")}>
                <Input.TextArea rows={3} maxLength={2000} />
              </Form.Item>
            </Form>
          </Card>
        </div>
      ) : grid.isPending ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <BudgetGrid
          t={t}
          months={months}
          rows={rows}
          edits={edits}
          readOnly={readOnly}
          onEdit={(accountId, month, value) =>
            setEdits((current) => {
              const key = `${accountId}|${month}`;
              const saved = Number(
                rows.find((r) => r.account_id === accountId)?.amounts?.[
                  month
                ] ?? 0,
              );
              const next = { ...current };
              // Back to the saved amount: no longer a change.
              if (Math.round(value * 100) === Math.round(saved * 100))
                delete next[key];
              else next[key] = value;
              return next;
            })
          }
          onRowAction={onRowAction}
          toolbar={toolbar}
        />
      )}

      <Modal
        open={detailsOpen}
        title={t("tabDetails")}
        okText={t("drawerSave")}
        cancelText={readOnly ? t("close") : t("cancel")}
        okButtonProps={{
          loading: saveDetails.isPending,
          style: readOnly ? { display: "none" } : undefined,
        }}
        onOk={() => saveDetails.mutate()}
        onCancel={() => setDetailsOpen(false)}
      >
        {detailsOpen ? (
          <Form
            form={form}
            layout="vertical"
            disabled={readOnly}
            requiredMark={readOnly ? false : "optional"}
            onValuesChange={() => setHeaderDirty(true)}
          >
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Form.Item
                name="name"
                label={t("fieldName")}
                rules={required(t("fieldName"))}
              >
                <Input maxLength={255} placeholder={t("namePlaceholder")} />
              </Form.Item>
              <Form.Item
                name="year"
                label={t("fieldYear")}
                tooltip={t("yearHelp")}
                rules={required(t("fieldYear"))}
              >
                <DatePicker
                  picker="year"
                  className="w-full"
                  disabled={readOnly || !creating}
                />
              </Form.Item>
            </div>
            {/* Empty = whole company. Only one branch: nothing to choose. */}
            {accessibleBranches.length > 1 ? (
              <Form.Item
                name="branch_id"
                label={t("fieldScope")}
                tooltip={t("scopeHelp")}
              >
                <Select
                  allowClear
                  placeholder={t("wholeCompany")}
                  options={branchOptions}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            ) : null}
            <Form.Item name="notes" label={t("fieldNotes")}>
              <Input.TextArea rows={3} maxLength={2000} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={dialog != null}
        title={
          dialog
            ? t(`dialog_${dialog.type}`, {
                account: dialog.row
                  ? `${dialog.row.code} ${dialog.row.name}`
                  : "",
              })
            : ""
        }
        okText={
          dialog &&
          (dialog.type === "copyActuals" || dialog.type === "copyFrom")
            ? t("fillGrid")
            : t("apply")
        }
        cancelText={t("cancel")}
        okButtonProps={{ loading: action.isPending }}
        onOk={submitDialog}
        onCancel={() => setDialog(null)}
      >
        <Form form={dialogForm} layout="vertical">
          {dialog?.type === "spread" ? (
            <Form.Item
              name="amount"
              label={t("yearlyAmount")}
              extra={t("spreadHelp")}
              rules={required(t("yearlyAmount"))}
            >
              <TenantNumberInput
                kind="money"
                min={0}
                style={{ width: "100%" }}
                addonAfter={settings.primaryCurrencySymbol || undefined}
              />
            </Form.Item>
          ) : null}
          {dialog?.type === "copyActuals" ? (
            <Form.Item
              name="year"
              label={t("sourceYear")}
              extra={t("copyActualsHelp")}
              rules={required(t("sourceYear"))}
            >
              <DatePicker picker="year" className="w-full" />
            </Form.Item>
          ) : null}
          {dialog?.type === "copyFrom" ? (
            <Form.Item
              name="source_budget_id"
              label={t("sourceBudget")}
              extra={t("copyFromHelp")}
              rules={required(t("sourceBudget"))}
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={otherBudgets.isPending}
                options={(otherBudgets.data?.rows ?? [])
                  .filter((b) => String(b.id) !== String(id))
                  .map((b) => ({
                    value: String(b.id),
                    label: `${b.name} · ${b.year}${b.version > 1 ? ` v${b.version}` : ""}`,
                  }))}
              />
            </Form.Item>
          ) : null}
          {dialog && dialog.type !== "spread" ? (
            <Form.Item
              name="percent"
              label={t("adjustPercent")}
              tooltip={t("adjustPercentHelp")}
            >
              <TenantNumberInput
                kind="percent"
                style={{ width: "100%" }}
                addonAfter="%"
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </ResourceCrudDrawer>
  );
}
