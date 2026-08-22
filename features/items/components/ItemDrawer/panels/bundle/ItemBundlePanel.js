"use client";

/**
 * Bundle tab — read-only table or editable bundle line editor.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { fetchBundleItems } from "../../../../api/bundleItems.api";
import { fetchItemNames } from "../../../../api/items.api";
import { itemBundleItemsQueryKey } from "../../../../queries/itemBundleQueryCache";
import { getItemTypeCode } from "../../../../utils/itemFormMappers";
import { formatItemOptionLabel } from "../../../../utils/formatItemLabel";
import { useQuery } from "@tanstack/react-query";
import { Table } from "antd";
import { useMemo } from "react";
import { isPersistedEntityId, normalizeEntityId } from "@/lib/entityId";
import { buildBundleLineEditorKey } from "../shared/lineEditorKeys";
import { BundleLineEditor } from "./BundleLineEditor";
import { ITEMS_LIST_QUERY_KEY } from "../../../../queries/itemsQueryKeys";

/**
 * @param {{ itemId: string; readOnly: boolean; t: (k: string) => string; tApiErrors: (k: string) => string; active: boolean }} props
 */
export function ItemBundlePanel({ itemId, readOnly, t, tApiErrors, active }) {
  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: active,
    staleTime: 5 * 60_000,
  });

  const bundleQuery = useQuery({
    queryKey: itemBundleItemsQueryKey(itemId),
    queryFn: () => fetchBundleItems(itemId),
    enabled: active && isPersistedEntityId(itemId),
  });

  const bundleSeed = useMemo(() => {
    if (!bundleQuery.data?.length) return [{ child_item_id: undefined, quantity: undefined }];
    return bundleQuery.data.map((r) => ({
      child_item_id: normalizeEntityId(r.child_item_id) ?? undefined,
      quantity: Number(r.quantity),
    }));
  }, [bundleQuery.data]);

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((i) => i.id !== itemId && getItemTypeCode(i) !== "BUNDLE")
        .map((i) => ({ value: i.id, label: formatItemOptionLabel(i) })),
    [itemsQuery.data, itemId],
  );

  const editorKey = useMemo(() => buildBundleLineEditorKey(itemId, bundleSeed), [itemId, bundleSeed]);

  if (readOnly) {
    return (
      <section className="item-lines-panel">
        <ResourceDrawerPanelHeader title={t("tabBundle")} description={t("tabBundleDescription")} />
        <div className="item-lines-section-card">
          <Table
            className="resource-drawer-data-table"
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={bundleQuery.data ?? []}
            columns={[
              { title: t("bundleColItem"), render: (_v, r) => r.child_item?.name ?? "—" },
              { title: t("bundleColQty"), dataIndex: "quantity", key: "qty", width: 112 },
            ]}
          />
        </div>
      </section>
    );
  }

  return (
    <BundleLineEditor
      key={editorKey}
      itemId={itemId}
      initialLines={bundleSeed}
      itemOptions={itemOptions}
      t={t}
      tApiErrors={tApiErrors}
    />
  );
}
