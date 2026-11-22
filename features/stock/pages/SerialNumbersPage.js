"use client";

import { SOURCE_DOCUMENT_FEATURE } from "@/features/accounting/accountingUtils";
import { WAREHOUSES_LIST_QUERY_KEY, fetchWarehouseNames } from "@/features/warehouses";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { formatTenantDate } from "@/lib/tenant-format";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { EditOutlined, EyeOutlined, FileTextOutlined, MoreOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Dropdown, Form, Select, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { SERIAL_STATUSES, SERIAL_STATUS_COLORS, fetchSerials } from "../api/serials.api";
import { STOCK_SERIALS_QUERY_KEY } from "../components/SerialNumberDrawer/SerialNumberDrawer";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../components/StockTableFilters/StockTableFilters";

function SerialNumbersTable() {
  const t = useTranslations("SerialNumbers");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("stock");
  const { openViewDrawer, openEditDrawer } = usePageDrawer("stockSerials");
  const { openStackedDrawer } = useGlobalDrawer();

  const [statuses, setStatuses] = useState(/** @type {string[]} */ ([]));
  const [warehouseId, setWarehouseId] = useState(/** @type {number | undefined} */ (undefined));
  const [warranty, setWarranty] = useState(/** @type {"" | "active" | "expired"} */ (""));

  const extraParams = useMemo(
    () => ({
      ...(statuses.length ? { status: statuses.join(",") } : {}),
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(warranty ? { warranty } : {}),
    }),
    [statuses, warehouseId, warranty],
  );

  const table = useTenantPaginatedTable({
    queryKey: STOCK_SERIALS_QUERY_KEY,
    queryFn: fetchSerials,
    extraParams,
    staleTime: QUERY_STALE_TIME.default,
    tableId: "stock-serials",
    t,
    tApiErrors,
    notification,
  });

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? []).map((w) => ({
        value: Number(w.id),
        label: w.shortcut_name ? `${w.shortcut_name} — ${w.name}` : String(w.name ?? w.id),
      })),
    [warehousesQuery.data],
  );
  const statusOptions = useMemo(
    () => SERIAL_STATUSES.map((value) => ({ value, label: t(`status_${value}`) })),
    [t],
  );

  const openDocument = useCallback(
    (ref) => {
      const featureId = ref ? SOURCE_DOCUMENT_FEATURE[ref.type] : null;
      if (featureId) openStackedDrawer({ featureId, id: String(ref.id), mode: "view" });
    },
    [openStackedDrawer],
  );

  const columns = useMemo(
    () => [
      {
        title: t("colSerial"),
        dataIndex: "serial_number",
        key: "serial_number",
        width: 190,
        render: (value, record) => (
          <Button type="link" className="!h-auto !p-0 font-mono" onClick={() => openViewDrawer(record)}>
            {value}
          </Button>
        ),
      },
      {
        title: t("colItem"),
        key: "item",
        width: 240,
        ellipsis: true,
        render: (_, record) => (record.item ? [record.item.item_code, record.item.name].filter(Boolean).join(" — ") : "—"),
      },
      {
        title: t("colStatus"),
        dataIndex: "status",
        key: "status",
        width: 160,
        render: (value) => <Tag color={SERIAL_STATUS_COLORS[value]}>{t(`status_${value}`)}</Tag>,
      },
      {
        title: t("colWarehouse"),
        key: "warehouse",
        width: 150,
        render: (_, record) => record.warehouse?.name ?? "—",
      },
      {
        title: t("colCustomer"),
        key: "customer",
        width: 180,
        ellipsis: true,
        render: (_, record) => record.customer?.name ?? "—",
      },
      {
        title: t("colSold"),
        key: "sold",
        width: 240,
        render: (_, record) =>
          record.sold_ref ? (
            <span className="whitespace-nowrap">
              {formatTenantDate(record.sold_at)}{" "}
              <Typography.Text type="secondary" className="text-xs">
                {record.sold_ref.number ?? ""}
              </Typography.Text>
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: t("colReceived"),
        key: "received",
        width: 240,
        render: (_, record) =>
          record.received_ref ? (
            <span className="whitespace-nowrap">
              {formatTenantDate(record.received_at)}{" "}
              <Typography.Text type="secondary" className="text-xs">
                {record.received_ref.number ?? ""}
              </Typography.Text>
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: t("colWarranty"),
        key: "warranty",
        width: 210,
        render: (_, record) =>
          record.warranty_ends_on ? (
            <span className="whitespace-nowrap">
              {formatTenantDate(record.warranty_ends_on)}{" "}
              <Tag color={record.in_warranty ? "green" : "default"}>
                {record.in_warranty ? t("inWarranty") : t("warrantyExpired")}
              </Tag>
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: t("colActions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, record) => (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "view", label: t("actionView"), icon: <EyeOutlined />, onClick: () => openViewDrawer(record) },
                {
                  key: "edit",
                  label: t("actionEdit"),
                  icon: <EditOutlined />,
                  disabled: !access.canEdit,
                  onClick: () => openEditDrawer(record),
                },
                { type: "divider" },
                {
                  key: "received",
                  label: t("actionOpenReceipt"),
                  icon: <FileTextOutlined />,
                  disabled: !record.received_ref || !SOURCE_DOCUMENT_FEATURE[record.received_ref.type],
                  onClick: () => openDocument(record.received_ref),
                },
                {
                  key: "sold",
                  label: t("actionOpenSale"),
                  icon: <ShoppingOutlined />,
                  disabled: !record.sold_ref || !SOURCE_DOCUMENT_FEATURE[record.sold_ref.type],
                  onClick: () => openDocument(record.sold_ref),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        ),
      },
    ],
    [access.canEdit, openDocument, openEditDrawer, openViewDrawer, t],
  );

  const clearAll = useCallback(() => {
    setStatuses([]);
    setWarehouseId(undefined);
    setWarranty("");
  }, []);

  const summary = useMemo(() => {
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (statuses.length) lines.push({ label: t("filterStatus"), value: statuses.map((s) => t(`status_${s}`)).join(", ") });
    if (warehouseId != null) {
      lines.push({
        label: t("filterWarehouse"),
        value: warehouseOptions.find((o) => o.value === warehouseId)?.label ?? String(warehouseId),
      });
    }
    if (warranty) lines.push({ label: t("filterWarranty"), value: warranty === "active" ? t("inWarranty") : t("warrantyExpired") });
    return lines;
  }, [statuses, t, warehouseId, warehouseOptions, warranty]);

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: summary.length,
    summary,
    onClearAll: clearAll,
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("filterStatus")}>
          <Select
            mode="multiple"
            allowClear
            className="w-full"
            value={statuses}
            options={statusOptions}
            onChange={(value) => setStatuses(value)}
            maxTagCount="responsive"
          />
        </Form.Item>
        <Form.Item label={t("filterWarehouse")}>
          <Select
            allowClear
            className="w-full"
            value={warehouseId}
            options={warehouseOptions}
            loading={warehousesQuery.isPending}
            onChange={(value) => setWarehouseId(value ?? undefined)}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item label={t("filterWarranty")}>
          <Select
            className="w-full"
            value={warranty}
            options={[
              { value: "", label: t("filterAny") },
              { value: "active", label: t("inWarranty") },
              { value: "expired", label: t("warrantyExpired") },
            ]}
            onChange={(value) => setWarranty(value)}
          />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="stock-serials"
        columns={columns}
        dataSource={table.rows}
        rowKey="id"
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={t("listEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: table.onSearchChange,
          showRefresh: true,
          onRefresh: () => table.refetch(),
          showAdd: false,
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1500}
        enableColumnDrag
        pagination={table.pagination}
      />
    </div>
  );
}

export default function SerialNumbersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <SerialNumbersTable />
    </div>
  );
}
