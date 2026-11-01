"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { formatTenantNumber } from "@/lib/tenant-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Select, Table, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  ITEM_ATTRIBUTES_QUERY_KEY,
  ITEM_VARIANTS_QUERY_KEY,
  fetchItemAttributes,
  fetchItemVariants,
  generateItemVariants,
} from "../../../api/itemVariants.api";
import { ITEMS_LIST_QUERY_KEY } from "../../../queries/itemsQueryKeys";

/**
 * Variants tab: choose attributes + values, generate the missing child items, list the children.
 *
 * @param {{ itemId: string | number; readOnly: boolean; active: boolean }} props
 */
export default function ItemVariantsPanel({ itemId, readOnly, active }) {
  const t = useTranslations("ItemVariants");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const { openStackedDrawer } = useGlobalDrawer();
  const queryClient = useQueryClient();
  const id = String(itemId);

  const attributesQuery = useQuery({ queryKey: ITEM_ATTRIBUTES_QUERY_KEY, queryFn: fetchItemAttributes, enabled: active });
  const variantsQuery = useQuery({ queryKey: [...ITEM_VARIANTS_QUERY_KEY, id], queryFn: () => fetchItemVariants(id), enabled: active });

  /** Unsaved edits; null means "show what the server has". */
  const [draft, setDraft] = useState(/** @type {Array<{ attribute_id?: number; value_ids: number[] }> | null} */ (null));
  const locked = (variantsQuery.data?.variants.length ?? 0) > 0;
  const saved = useMemo(() => {
    const rows = variantsQuery.data?.attributes ?? [];
    return rows.length ? rows.map((a) => ({ attribute_id: a.id, value_ids: a.value_ids })) : [{ value_ids: [] }];
  }, [variantsQuery.data]);
  const selection = draft ?? saved;
  const setSelection = (fn) => setDraft(fn(selection));

  const attributes = useMemo(() => attributesQuery.data ?? [], [attributesQuery.data]);
  const byId = useMemo(() => new Map(attributes.map((a) => [a.id, a])), [attributes]);

  const generate = useMutation({
    mutationFn: () =>
      generateItemVariants(
        id,
        selection.filter((s) => s.attribute_id != null && s.value_ids.length > 0).map((s) => ({ attribute_id: Number(s.attribute_id), value_ids: s.value_ids })),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData([...ITEM_VARIANTS_QUERY_KEY, id], { attributes: data?.attributes ?? [], variants: data?.variants ?? [] });
      queryClient.invalidateQueries({ queryKey: ITEMS_LIST_QUERY_KEY });
      setDraft(null);
      notification.success({ title: t("generated", { count: Number(data?.created ?? 0) }) });
    },
    onError: (error) => notification.error({ title: t("generateError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const update = (index, patch) => setSelection((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const combinations = selection.reduce((n, s) => (s.attribute_id != null && s.value_ids.length ? n * s.value_ids.length : n), 1);
  const canGenerate = selection.some((s) => s.attribute_id != null && s.value_ids.length > 0);

  const columns = [
    { title: t("colCode"), dataIndex: "item_code", key: "item_code", width: 170, render: (v) => <Typography.Text code>{v}</Typography.Text> },
    { title: t("colName"), dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("colValues"),
      key: "values",
      render: (_, row) => (row.values ?? []).map((v) => <Tag key={v.value_id}>{v.name}</Tag>),
    },
    {
      title: t("colPrice"),
      dataIndex: "selling_price",
      key: "selling_price",
      align: "right",
      width: 110,
      render: (v) => (v != null ? formatTenantNumber(v, { decimals: 2 }) : "—"),
    },
    {
      title: t("colOnHand"),
      dataIndex: "on_hand",
      key: "on_hand",
      align: "right",
      width: 100,
      render: (v) => formatTenantNumber(v, { decimals: 3, trimTrailingZeros: true }),
    },
    {
      title: "",
      key: "open",
      width: 80,
      render: (_, row) => (
        <Button size="small" type="link" onClick={() => openStackedDrawer({ featureId: "items", id: String(row.id), mode: "edit" })}>
          {t("open")}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Typography.Text type="secondary">{t("intro")}</Typography.Text>
      {attributesQuery.isSuccess && attributes.length === 0 ? <Alert type="info" showIcon title={t("noAttributes")} /> : null}
      {!readOnly ? (
        <div className="flex flex-col gap-2">
          {selection.map((row, index) => {
            const attribute = row.attribute_id != null ? byId.get(row.attribute_id) : undefined;
            return (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  className="!w-48"
                  placeholder={t("attribute")}
                  disabled={locked}
                  value={row.attribute_id}
                  onChange={(v) => update(index, { attribute_id: v, value_ids: [] })}
                  options={attributes
                    .filter((a) => a.id === row.attribute_id || !selection.some((s) => s.attribute_id === a.id))
                    .map((a) => ({ value: a.id, label: a.name }))}
                />
                <Select
                  mode="multiple"
                  className="!w-96 max-w-full"
                  placeholder={t("values")}
                  disabled={!attribute}
                  value={row.value_ids}
                  onChange={(v) => update(index, { value_ids: v })}
                  options={(attribute?.values ?? []).map((v) => ({ value: v.id, label: v.name }))}
                />
                {!locked && selection.length > 1 ? (
                  <Button onClick={() => setSelection((rows) => rows.filter((_, i) => i !== index))}>{t("remove")}</Button>
                ) : null}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2">
            {!locked && selection.length < 3 ? (
              <Button onClick={() => setSelection((rows) => [...rows, { value_ids: [] }])}>{t("addAttribute")}</Button>
            ) : null}
            <Button type="primary" disabled={!canGenerate} loading={generate.isPending} onClick={() => generate.mutate()}>
              {t("generate")}
            </Button>
            {canGenerate ? <Typography.Text type="secondary">{t("combinations", { count: combinations })}</Typography.Text> : null}
          </div>
          {locked ? <Typography.Text type="secondary">{t("lockedHint")}</Typography.Text> : null}
        </div>
      ) : null}
      <Table
        size="small"
        rowKey="id"
        loading={variantsQuery.isPending}
        columns={columns}
        dataSource={variantsQuery.data?.variants ?? []}
        pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("empty")} /> }}
      />
    </div>
  );
}
