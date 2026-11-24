"use client";

import { SOURCE_DOCUMENT_FEATURE } from "@/features/accounting/accountingUtils";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { isPersistedEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { formatTenantDate } from "@/lib/tenant-format";
import { useTenantModules } from "@/lib/tenant-modules";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Input, Table, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";
import { SERIAL_STATUS_COLORS, fetchSerials } from "../api/serials.api";
import { STOCK_SERIALS_QUERY_KEY } from "./SerialNumberDrawer/SerialNumberDrawer";

const PAGE_SIZE = 10;

/**
 * Customer drawer: units sold to this customer, with warranty and a link to the sale.
 * Hidden without the inventory module or stock view permission, and on a new customer.
 *
 * @param {{ customerId: string | number | null | undefined }} props
 */
export default function CustomerSerialsPanel({ customerId }) {
  const t = useTranslations("SerialNumbers");
  const access = useResourceAccess("stock");
  const { moduleSet } = useTenantModules();
  const { openStackedDrawer } = useGlobalDrawer();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());

  const enabled = isPersistedEntityId(customerId) && access.canView && Boolean(moduleSet?.has("inventory"));
  const params = { customer_id: String(customerId ?? ""), search: deferredSearch || undefined, page, per_page: PAGE_SIZE, sort: "sold_at" };
  const query = useQuery({
    queryKey: [...STOCK_SERIALS_QUERY_KEY, "customer", params],
    queryFn: () => fetchSerials(params),
    enabled,
    staleTime: QUERY_STALE_TIME.default,
    placeholderData: (previous) => previous,
  });

  const columns = useMemo(
    () => [
      {
        title: t("colSerial"),
        dataIndex: "serial_number",
        key: "serial_number",
        width: 170,
        render: (value, record) => (
          <Button
            type="link"
            className="!h-auto !p-0 font-mono"
            onClick={() => openStackedDrawer({ featureId: "stockSerials", id: String(record.id), mode: "view" })}
          >
            {value}
          </Button>
        ),
      },
      {
        title: t("colItem"),
        key: "item",
        ellipsis: true,
        render: (_, record) => (record.item ? [record.item.item_code, record.item.name].filter(Boolean).join(" — ") : "—"),
      },
      {
        title: t("colStatus"),
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (value) => <Tag color={SERIAL_STATUS_COLORS[value]}>{t(`status_${value}`)}</Tag>,
      },
      {
        title: t("colSold"),
        key: "sold",
        width: 270,
        render: (_, record) => {
          if (!record.sold_ref) return record.sold_at ? formatTenantDate(record.sold_at) : "—";
          const featureId = SOURCE_DOCUMENT_FEATURE[record.sold_ref.type];
          const label = `${formatTenantDate(record.sold_at)} · ${record.sold_ref.number ?? ""}`;
          return featureId ? (
            <Button
              type="link"
              className="!h-auto !p-0"
              onClick={() => openStackedDrawer({ featureId, id: String(record.sold_ref.id), mode: "view" })}
            >
              {label}
            </Button>
          ) : (
            label
          );
        },
      },
      {
        title: t("colWarranty"),
        key: "warranty",
        width: 220,
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
    ],
    [openStackedDrawer, t],
  );

  if (!enabled) return null;

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  // Nothing sold and no search typed: keep the drawer short.
  if (!query.isPending && total === 0 && !deferredSearch) return null;

  return (
    <div className="mt-8">
      <ResourceDrawerPanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            {t("customerPanelTitle")}
            {total > 0 ? <Badge count={total} overflowCount={999} color="var(--ant-color-primary)" /> : null}
          </span>
        }
        help={t("customerPanelHelp")}
        actions={
          <Input
            allowClear
            size="small"
            prefix={<SearchOutlined />}
            placeholder={t("customerPanelSearch")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="!w-56"
          />
        }
      />
      <Table
        size="small"
        rowKey="id"
        loading={query.isFetching}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1000 }}
        locale={{ emptyText: t("customerPanelEmpty") }}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false, hideOnSinglePage: true, onChange: setPage }}
      />
    </div>
  );
}
