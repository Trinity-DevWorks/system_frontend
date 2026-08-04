"use client";

import { fetchCurrencyRateHistory } from "@/services/currenciesApi";
import {
  dayjsDatePattern,
  formatTenantDate,
  formatTenantNumber,
} from "@/lib/tenant-format";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Modal, Select, Spin, Table, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

/**
 * @param {{
 *   open: boolean;
 *   currency: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function CurrencyRateHistoryModal({ open, currency, onClose }) {
  const t = useTranslations("Currencies");
  const currencyId = currency?.id != null ? Number(currency.id) : null;
  const [dateRange, setDateRange] = useState(null);
  const [selectedToId, setSelectedToId] = useState("");
  const datePickerFormat = dayjsDatePattern();

  const fromStr = dateRange?.[0]?.format("YYYY-MM-DD");
  const toStr = dateRange?.[1]?.format("YYYY-MM-DD");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "tenant",
      "currencies",
      currencyId,
      "rate-history",
      fromStr ?? "",
      toStr ?? "",
    ],
    queryFn: () =>
      fetchCurrencyRateHistory(/** @type {number} */ (currencyId), {
        ...(fromStr ? { from: fromStr } : {}),
        ...(toStr ? { to: toStr } : {}),
      }),
    enabled: open && currencyId != null && Number.isFinite(currencyId),
  });

  const pairs = useMemo(() => {
    const raw =
      data && typeof data === "object" && "pairs" in data ? data.pairs : null;
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const effectiveSelectedToId =
    selectedToId ||
    (pairs[0]?.to_currency?.id != null
      ? String(pairs[0].to_currency.id)
      : "");

  const selectedPair = useMemo(() => {
    if (!effectiveSelectedToId) return pairs[0] ?? null;
    return (
      pairs.find(
        (p) => String(p?.to_currency?.id) === String(effectiveSelectedToId),
      ) ?? null
    );
  }, [pairs, effectiveSelectedToId]);

  const historyRows = useMemo(() => {
    const raw = selectedPair?.history;
    return Array.isArray(raw) ? raw : [];
  }, [selectedPair]);

  const formatPeriod = (row) => {
    const from = formatTenantDate(row.effective_from) || "\u2014";
    const to = row.effective_to ? formatTenantDate(row.effective_to) : null;
    return to ? `${from} \u2013 ${to}` : from;
  };

  const titleName =
    typeof currency?.code === "string"
      ? currency.code
      : String(currencyId ?? "");

  return (
    <Modal
      title={`${t("rateHistoryTitle")} \u2013 ${titleName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : isError ? (
        <Typography.Text type="danger">
          {t("rateHistoryError")} {error?.message ?? ""}
        </Typography.Text>
      ) : pairs.length === 0 ? (
        <Typography.Text type="secondary">
          {t("rateHistoryEmpty")}
        </Typography.Text>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(r) => setDateRange(r)}
              allowEmpty={[true, true]}
              format={datePickerFormat}
            />
            <Select
              className="min-w-[140px]"
              value={effectiveSelectedToId || undefined}
              onChange={setSelectedToId}
              options={pairs.map((p) => ({
                value: String(p.to_currency?.id ?? ""),
                label:
                  p.to_currency?.code ??
                  p.to_currency?.name ??
                  String(p.to_currency?.id),
              }))}
            />
          </div>
          {selectedPair ? (
            <Typography.Text type="secondary" className="text-sm">
              1 {currency?.code} ={" "}
              {formatTenantNumber(selectedPair.current_rate, {
                decimals: 6,
                trimTrailingZeros: true,
              }) || String(selectedPair.current_rate)}{" "}
              {selectedPair.to_currency?.code}
            </Typography.Text>
          ) : null}
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            columns={[
              {
                title: t("rateHistoryPeriod"),
                dataIndex: "period",
                key: "period",
              },
              {
                title: t("rateHistoryRate"),
                dataIndex: "rate",
                key: "rate",
                align: "right",
              },
              {
                title: t("rateHistoryUpdatedBy"),
                dataIndex: "updated_by",
                key: "updated_by",
              },
            ]}
            dataSource={historyRows.map((row) => {
              const ef = String(row.effective_from ?? "");
              const et = String(row.effective_to ?? "");
              const key = `${ef}|${et}|${String(row.rate)}|${String(row.updated_by ?? "")}`;
              return {
                key,
                period: formatPeriod(row),
                rate:
                  formatTenantNumber(row.rate, {
                    decimals: 6,
                    trimTrailingZeros: true,
                  }) || String(row.rate ?? "\u2014"),
                updated_by: row.updated_by ?? "\u2014",
              };
            })}
          />
        </div>
      )}
    </Modal>
  );
}
