"use client";

import { ROUTES } from "@/features/registry";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { withLocalePrefix } from "@/lib/locale-path";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useCompanySettings } from "@/lib/company-settings";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol, formatTenantNumber } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { openPdfBlobForPrint, savePdfBlob } from "@/shared/api/downloadPdf";
import { DeleteOutlined, DownloadOutlined, PlusOutlined, PrinterOutlined, SettingOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Card, DatePicker, Empty, Segmented, Select, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { SCALE_LABEL_TEMPLATES_QUERY_KEY, fetchScaleLabelItems, fetchScaleLabelTemplates, printScaleLabels } from "../api/scaleLabels.api";

let lineSeq = 0;

/**
 * Packing station: pick an item, type the weight (or count, or price), Enter adds the line; print the
 * labels on a label printer or A4 sheet. Lines stay on screen to reprint.
 */
export default function PrintScaleLabelsPage() {
  const t = useTranslations("ScaleLabels");
  const tApiErrors = useTranslations("ApiErrors");
  const locale = useLocale();
  const { notification } = App.useApp();
  const access = useResourceAccess("scale_labels");
  const settingsAccess = useResourceAccess("scale_barcode_formats");
  const { settings } = useCompanySettings();
  // Label prices are the selling price, so they are in the primary currency.
  const currencySymbol = settings.primaryCurrencySymbol;
  const [templateId, setTemplateId] = useState(/** @type {number | null} */ (null));
  const [packedDate, setPackedDate] = useState(() => dayjs());
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState(/** @type {string | null} */ (null));
  const [entryBy, setEntryBy] = useState(/** @type {"quantity" | "total"} */ ("quantity"));
  const [amount, setAmount] = useState(/** @type {number | null} */ (null));
  const [copies, setCopies] = useState(/** @type {number | null} */ (1));
  const [lines, setLines] = useState(/** @type {Array<Record<string, any>>} */ ([]));
  const amountRef = useRef(/** @type {any} */ (null));
  const itemRef = useRef(/** @type {any} */ (null));

  const templates = useQuery({
    queryKey: [...SCALE_LABEL_TEMPLATES_QUERY_KEY, "active-all"],
    queryFn: () => fetchScaleLabelTemplates({ per_page: 100, active: "1" }),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const templateRows = templates.data?.rows ?? [];
  const effectiveTemplateId = templateId ?? (templateRows[0] ? Number(templateRows[0].id) : null);
  const template = templateRows.find((r) => Number(r.id) === effectiveTemplateId) ?? null;
  const valueType = template?.barcode_format?.value_type ?? "weight";

  const items = useQuery({
    queryKey: ["tenant", "scale-labels", "items", search],
    queryFn: () => fetchScaleLabelItems(search),
    staleTime: QUERY_STALE_TIME.items,
  });
  const itemRows = Array.isArray(items.data) ? items.data : [];
  const [picked, setPicked] = useState(/** @type {Record<string, any> | null} */ (null));

  const addLine = () => {
    if (!picked || !amount || amount <= 0) return;
    const unitPrice = Number(picked.unit_price ?? 0);
    const quantity = entryBy === "quantity" ? amount : unitPrice > 0 ? Math.round((amount / unitPrice) * 1000) / 1000 : 0;
    const total = entryBy === "total" ? amount : Math.round(amount * unitPrice * 1e6) / 1e6;
    const useBy = picked.shelf_life_days != null ? packedDate.add(Number(picked.shelf_life_days), "day").format("YYYY-MM-DD") : null;
    lineSeq += 1;
    setLines((prev) => [
      ...prev,
      {
        key: `l${lineSeq}`,
        item_id: picked.id,
        name: picked.name,
        plu: picked.plu_code,
        unit: picked.unit_code ?? "",
        unit_price: unitPrice,
        quantity,
        total,
        entryBy,
        amount,
        copies: copies && copies > 0 ? copies : 1,
        packed_date: packedDate.format("YYYY-MM-DD"),
        use_by: useBy,
      },
    ]);
    setAmount(null);
    setCopies(1);
    amountRef.current?.focus?.();
  };

  const toPayloadLines = (rows) =>
    rows.map((l) => ({
      item_id: l.item_id,
      ...(l.entryBy === "total" ? { total: l.amount } : { quantity: l.amount }),
      copies: l.copies,
      packed_date: l.packed_date,
    }));

  const print = useMutation({
    mutationFn: async ({ rows, mode }) => {
      const blob = await printScaleLabels(/** @type {number} */ (effectiveTemplateId), toPayloadLines(rows));
      if (mode === "download") savePdfBlob(blob, `scale-labels-${dayjs().format("YYYYMMDD-HHmmss")}.pdf`);
      else await openPdfBlobForPrint(blob);
    },
    onError: (error) => notification.error({ title: t("printError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const totalLabels = lines.reduce((sum, l) => sum + Number(l.copies ?? 1), 0);
  const columns = useMemo(
    () => [
      { title: t("colItem"), dataIndex: "name", key: "name", ellipsis: true, render: (v) => <span dir="auto">{v}</span> },
      { title: t("labelField_plu"), dataIndex: "plu", key: "plu", width: 90 },
      { title: t("colQuantity"), key: "quantity", width: 130, align: "right", render: (_, l) => `${formatTenantNumber(l.quantity, { decimals: 3 })} ${l.unit}` },
      { title: t("colUnitPrice"), dataIndex: "unit_price", key: "unit_price", width: 120, align: "right", render: (v) => formatTenantMoneyWithSymbol(v, currencySymbol) },
      { title: t("colTotal"), dataIndex: "total", key: "total", width: 120, align: "right", render: (v) => formatTenantMoneyWithSymbol(v, currencySymbol) },
      { title: t("colPacked"), dataIndex: "packed_date", key: "packed", width: 120, render: (v) => formatTenantDate(v) },
      { title: t("colUseBy"), dataIndex: "use_by", key: "use_by", width: 120, render: (v) => (v ? formatTenantDate(v) : "—") },
      { title: t("colCopies"), dataIndex: "copies", key: "copies", width: 80, align: "right" },
      {
        title: t("colActions"),
        key: "actions",
        width: 110,
        align: "center",
        render: (_, l) => (
          <div className="flex justify-center gap-1">
            <Button size="small" type="text" icon={<PrinterOutlined />} aria-label={t("reprint")} disabled={!access.canPrint || !effectiveTemplateId} onClick={() => print.mutate({ rows: [l], mode: "print" })} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={t("removeLine")} onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, access.canPrint, effectiveTemplateId, currencySymbol],
  );

  if (!templates.isPending && templateRows.length === 0) {
    return (
      <Empty description={t("noTemplates")} className="mt-10">
        {settingsAccess.canView ? (
          <Link href={withLocalePrefix(locale, ROUTES.scaleLabelTemplates)}>
            <Button icon={<SettingOutlined />}>{t("manageTemplates")}</Button>
          </Link>
        ) : null}
      </Empty>
    );
  }

  const amountLabel = entryBy === "total" ? t("enterTotal") : valueType === "count" ? t("enterCount") : t("enterWeight");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card size="small">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <Typography.Text type="secondary" className="mb-1 block text-xs">
              {t("template")}
            </Typography.Text>
            <Select
              className="w-full"
              value={effectiveTemplateId ?? undefined}
              loading={templates.isPending}
              onChange={(v) => setTemplateId(Number(v))}
              options={templateRows.map((r) => ({ value: Number(r.id), label: `${r.name} · ${t("sizeMm", { width: Number(r.width_mm), height: Number(r.height_mm) })}` }))}
            />
          </div>
          <div>
            <Typography.Text type="secondary" className="mb-1 block text-xs">
              {t("packedDate")}
            </Typography.Text>
            <DatePicker className="w-full" value={packedDate} allowClear={false} format={dayjsDatePattern()} onChange={(d) => d && setPackedDate(d)} />
          </div>
        </div>
        {template && !template.barcode_format ? <Alert className="!mt-3" type="info" showIcon title={t("noBarcodeInfo")} /> : null}
      </Card>

      <Card size="small" title={t("addLabels")}>
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,2.4fr)_auto_minmax(0,1fr)_minmax(0,0.6fr)_auto]">
          <div>
            <Typography.Text type="secondary" className="mb-1 block text-xs">
              {t("colItem")}
            </Typography.Text>
            <Select
              ref={itemRef}
              className="w-full"
              showSearch
              filterOption={false}
              onSearch={setSearch}
              value={itemId ?? undefined}
              placeholder={t("itemPlaceholder")}
              loading={items.isFetching}
              notFoundContent={items.isFetching ? null : t("noScaleItems")}
              onChange={(v) => {
                setItemId(String(v));
                setPicked(itemRows.find((r) => String(r.id) === String(v)) ?? null);
                window.setTimeout(() => amountRef.current?.focus?.(), 0);
              }}
              options={itemRows.map((r) => ({
                value: String(r.id),
                label: (
                  <span className="flex justify-between gap-2">
                    <span dir="auto" className="truncate">{r.name}</span>
                    <Typography.Text type="secondary" className="text-xs">
                      {r.plu_code} · {formatTenantMoneyWithSymbol(r.unit_price, currencySymbol)}/{r.unit_code}
                    </Typography.Text>
                  </span>
                ),
              }))}
            />
          </div>
          <Segmented
            value={entryBy}
            onChange={(v) => setEntryBy(/** @type {"quantity" | "total"} */ (v))}
            options={[
              { value: "quantity", label: valueType === "count" ? t("byCount") : t("byWeight") },
              { value: "total", label: t("byPrice") },
            ]}
          />
          <div>
            <Typography.Text type="secondary" className="mb-1 block text-xs">
              {amountLabel}
              {picked && entryBy === "quantity" ? ` (${picked.unit_code})` : ""}
            </Typography.Text>
            <TenantNumberInput
              ref={amountRef}
              kind={entryBy === "total" ? "money" : "quantity"}
              min={0}
              className="w-full"
              value={amount}
              addonAfter={entryBy === "total" ? currencySymbol || undefined : undefined}
              onChange={(v) => setAmount(v == null ? null : Number(v))}
              onPressEnter={addLine}
            />
          </div>
          <div>
            <Typography.Text type="secondary" className="mb-1 block text-xs">
              {t("colCopies")}
            </Typography.Text>
            <TenantNumberInput kind="integer" min={1} max={500} className="w-full" value={copies} onChange={(v) => setCopies(v == null ? null : Number(v))} onPressEnter={addLine} />
          </div>
          <Button type="primary" icon={<PlusOutlined />} disabled={!picked || !amount} onClick={addLine}>
            {t("addLine")}
          </Button>
        </div>
        {picked ? (
          <Typography.Text type="secondary" className="mt-2 block text-xs">
            {t("pickedInfo", {
              price: formatTenantMoneyWithSymbol(picked.unit_price, currencySymbol),
              unit: picked.unit_code ?? "",
              useBy: picked.shelf_life_days != null ? formatTenantDate(packedDate.add(Number(picked.shelf_life_days), "day").format("YYYY-MM-DD")) : "—",
            })}
          </Typography.Text>
        ) : null}
      </Card>

      <Card
        size="small"
        title={t("linesTitle", { count: totalLabels })}
        extra={
          <div className="flex gap-2">
            <Button icon={<DownloadOutlined />} disabled={!lines.length || !access.canPrint} loading={print.isPending && print.variables?.mode === "download"} onClick={() => print.mutate({ rows: lines, mode: "download" })}>
              {t("downloadPdf")}
            </Button>
            <Button type="primary" icon={<PrinterOutlined />} disabled={!lines.length || !access.canPrint} loading={print.isPending && print.variables?.mode === "print" && print.variables?.rows === lines} onClick={() => print.mutate({ rows: lines, mode: "print" })}>
              {t("printAll")}
            </Button>
          </div>
        }
      >
        <Table size="small" rowKey="key" pagination={false} dataSource={lines} columns={columns} scroll={{ x: 1000 }} locale={{ emptyText: t("noLines") }} />
      </Card>
    </div>
  );
}
