"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { DeleteOutlined, EditOutlined, EyeOutlined, MinusSquareOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { deleteAccount, fetchAccountTree } from "../api/accounting.api";
import { ACCOUNTS_QUERY_KEY, ACCOUNT_TREE_QUERY_KEY } from "../queries/accountingQueryKeys";

/**
 * Keep nodes that match, plus the ancestors leading to them.
 * @param {Array<Record<string, unknown>>} nodes
 * @param {string} needle
 * @returns {Array<Record<string, unknown>>}
 */
function filterTree(nodes, needle) {
  const out = [];
  for (const node of nodes) {
    const children = Array.isArray(node.children) ? filterTree(node.children, needle) : [];
    const hit =
      String(node.code ?? "").toLowerCase().startsWith(needle) ||
      String(node.name ?? "").toLowerCase().includes(needle);
    if (hit || children.length > 0) {
      out.push({ ...node, ...(children.length > 0 ? { children } : { children: undefined }) });
    }
  }
  return out;
}

/** @param {Array<Record<string, unknown>>} nodes */
function groupKeys(nodes, acc = []) {
  for (const node of nodes) {
    if (Array.isArray(node.children) && node.children.length > 0) {
      acc.push(node.id);
      groupKeys(node.children, acc);
    }
  }
  return acc;
}

function ChartOfAccountsTable() {
  const t = useTranslations("Accounting");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("accounts");
  const { openDrawer } = useGlobalDrawer();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("accounts");
  const [search, setSearch] = useState("");
  const [expandedKeys, setExpandedKeys] = useState(/** @type {import("react").Key[]} */ ([]));
  /** While searching, `null` means every matching group is open. An array is the user's own set. */
  const [searchExpandedKeys, setSearchExpandedKeys] = useState(/** @type {import("react").Key[] | null} */ (null));

  const treeQuery = useQuery({
    queryKey: ACCOUNT_TREE_QUERY_KEY,
    queryFn: fetchAccountTree,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  useEffect(() => {
    if (!treeQuery.isError) return;
    notification.error({
      title: t("accountsLoadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, treeQuery.error),
    });
  }, [notification, t, tApiErrors, treeQuery.error, treeQuery.isError]);

  const needle = search.trim().toLowerCase();
  const [searchNeedle, setSearchNeedle] = useState(needle);
  if (searchNeedle !== needle) {
    setSearchNeedle(needle);
    setSearchExpandedKeys(null);
  }
  const rows = useMemo(() => {
    const tree = treeQuery.data ?? [];
    return needle ? filterTree(tree, needle) : tree;
  }, [needle, treeQuery.data]);

  const visibleExpandedKeys = useMemo(
    () => (needle ? (searchExpandedKeys ?? groupKeys(rows)) : expandedKeys),
    [expandedKeys, needle, rows, searchExpandedKeys],
  );

  const collapseAll = useCallback(() => {
    if (needle) setSearchExpandedKeys([]);
    else setExpandedKeys([]);
  }, [needle]);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteAccount(id),
    onSuccess: () => {
      message.success(t("accountDeleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("accountDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      modal.confirm({
        title: t("accountDeleteConfirmTitle"),
        content: t("accountDeleteConfirmContent", { name: `${record.code} — ${record.name}` }),
        okText: t("actionDelete"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(Number(record.id))),
      });
    },
    [deleteMutation, modal, t],
  );

  const addChild = useCallback(
    (record) => {
      openDrawer({ featureId: "accounts", mode: "create", seed: { parent: record } });
    },
    [openDrawer],
  );

  const columns = useMemo(
    () => [
      {
        title: t("colCode"),
        dataIndex: "code",
        key: "code",
        width: 200,
        render: (value, record) => (
          <Typography.Text strong={Boolean(record.is_group)} className="tabular-nums">
            {value}
          </Typography.Text>
        ),
      },
      {
        title: t("colName"),
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        render: (value, record) => (
          <span className={record.is_active ? undefined : "text-neutral-400"}>
            {record.is_group ? <strong>{value}</strong> : value}
          </span>
        ),
      },
      {
        title: t("colType"),
        dataIndex: "type",
        key: "type",
        width: 120,
        render: (value) => (value ? t(`type_${value}`) : "\u2014"),
      },
      {
        title: t("colRoles"),
        dataIndex: "roles",
        key: "roles",
        width: 220,
        render: (value) =>
          Array.isArray(value) && value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {value.map((role) => (
                <Tag key={role} className="m-0" color="blue">
                  {t(`role_${role}`)}
                </Tag>
              ))}
            </div>
          ) : null,
      },
      {
        title: t("colBalance"),
        dataIndex: "balance",
        key: "balance",
        width: 180,
        align: "right",
        render: (value) => (Number(value ?? 0) === 0 ? "\u2014" : formatTenantMoneyWithSymbol(value, currencySymbol)),
      },
      {
        title: t("colActions"),
        key: "actions",
        width: 72,
        fixed: "right",
        render: (_, record) => {
          const items = [
            access.canView ? { key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => openViewDrawer(record) } : null,
            access.canEdit ? { key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => openEditDrawer(record) } : null,
            record.is_group && access.canAdd
              ? { key: "child", icon: <PlusOutlined />, label: t("actionAddChild"), onClick: () => addChild(record) }
              : null,
            access.canDelete && !record.children && (record.roles ?? []).length === 0
              ? { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("actionDelete"), onClick: () => handleDelete(record) }
              : null,
          ].filter(Boolean);
          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} onClick={(e) => e.stopPropagation()} />
            </Dropdown>
          );
        },
      },
    ],
    [access.canAdd, access.canDelete, access.canEdit, access.canView, addChild, currencySymbol, handleDelete, openEditDrawer, openViewDrawer, t],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="chart-of-accounts"
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={treeQuery.isPending}
        refreshFetching={treeQuery.isFetching}
        onRetry={() => treeQuery.refetch()}
        emptyText={needle ? t("accountsNoMatch") : t("accountsEmpty")}
        onRow={(record) => ({
          style: Array.isArray(record.children) && record.children.length > 0 ? { cursor: "pointer" } : undefined,
        })}
        expandable={{
          expandRowByClick: true,
          expandedRowKeys: visibleExpandedKeys,
          onExpandedRowsChange: (keys) => {
            const next = [...keys];
            if (needle) setSearchExpandedKeys(next);
            else setExpandedKeys(next);
          },
        }}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: setSearch,
          showImportExcel: false,
          showExportExcel: false,
          showExportPdf: false,
          showRefresh: true,
          onRefresh: () => treeQuery.refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewAccount"),
          extra: (
            <Button icon={<MinusSquareOutlined />} disabled={visibleExpandedKeys.length === 0} onClick={collapseAll}>
              {t("toolbarCloseAll")}
            </Button>
          ),
        }}
        stickyHeader
        scrollX={1000}
      />
    </div>
  );
}

export default function ChartOfAccountsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <ChartOfAccountsTable />
      </Suspense>
    </div>
  );
}
