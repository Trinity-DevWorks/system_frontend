"use client";

import { fetchCurrencyNames, fetchCurrencyPairRates, fetchOnlineExchangeRates, updateCurrency } from "@/services/currenciesApi";
import { SwapOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, InputNumber, Modal, Select, Space, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const CURRENCY_PAIR_RATES_QUERY_KEY = /** @type {const} */ (["tenant", "currencies", "pair-rates"]);

/**
 * @param {{
 *   open: boolean;
 *   currencies?: Record<string, unknown>[];
 *   onClose: () => void;
 * }} props
 */
export default function CurrencyExchangeRatesModal({ open, currencies, onClose }) {
  const t = useTranslations("Currencies");
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [newFromId, setNewFromId] = useState(undefined);
  const [newToId, setNewToId] = useState(undefined);
  const [newRate, setNewRate] = useState(undefined);
  const [editingKey, setEditingKey] = useState("");
  const [editRate, setEditRate] = useState(undefined);
  const [fetchingOnline, setFetchingOnline] = useState(false);

  const { data: currencyNames = [] } = useQuery({
    queryKey: ["tenant", "currencies"],
    queryFn: fetchCurrencyNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const currencyOptions = useMemo(
    () => {
      const rows = Array.isArray(currencyNames) && currencyNames.length > 0
        ? currencyNames
        : Array.isArray(currencies)
          ? currencies
          : [];
      return rows.map((c) => ({
        value: Number(c.id),
        label: String(c.code ?? c.name ?? c.id),
      }));
    },
    [currencyNames, currencies],
  );

  const { data: pairsRaw = [], isPending: pairsLoading } = useQuery({
    queryKey: CURRENCY_PAIR_RATES_QUERY_KEY,
    enabled: open,
    queryFn: async () => {
      const rows = await fetchCurrencyPairRates();
      const list = (Array.isArray(rows) ? rows : []).map((row) => ({
        key: `${row.from_currency_id}-${row.to_currency_id}`,
        from_currency_id: Number(row.from_currency_id),
        from_code: String(row.from_code ?? row.from_currency_id),
        to_currency_id: Number(row.to_currency_id),
        to_code: String(row.to_code ?? row.to_currency_id),
        rate: Number(row.rate),
      }));
      return list.sort((a, b) => {
        const fromCmp = a.from_code.localeCompare(b.from_code);
        if (fromCmp !== 0) return fromCmp;
        return a.to_code.localeCompare(b.to_code);
      });
    },
  });

  const hasPair = useMemo(() => {
    if (!newFromId || !newToId) return false;
    return pairsRaw.some(
      (p) =>
        (Number(p.from_currency_id) === Number(newFromId) && Number(p.to_currency_id) === Number(newToId)) ||
        (Number(p.from_currency_id) === Number(newToId) && Number(p.to_currency_id) === Number(newFromId)),
    );
  }, [pairsRaw, newFromId, newToId]);

  const saveMutation = useMutation({
    mutationFn: ({ fromId, toId, rate }) =>
      updateCurrency(toId, {
        from_currency_id: fromId,
        to_currency_id: toId,
        rate,
      }),
    onSuccess: (_data, { fromId, toId, rate }) => {
      const from = Number(fromId);
      const to = Number(toId);
      const nextRate = Number(rate);
      const fromOpt = currencyOptions.find((o) => Number(o.value) === from);
      const toOpt = currencyOptions.find((o) => Number(o.value) === to);
      if (fromOpt && toOpt && Number.isFinite(nextRate) && nextRate > 0) {
        queryClient.setQueryData(CURRENCY_PAIR_RATES_QUERY_KEY, (old) => {
          const list = Array.isArray(old) ? [...old] : [];
          const rowKey = `${from}-${to}`;
          const idx = list.findIndex(
            (p) =>
              p.key === rowKey ||
              (Number(p.from_currency_id) === from && Number(p.to_currency_id) === to),
          );
          const row = {
            key: rowKey,
            from_currency_id: from,
            from_code: fromOpt.label,
            to_currency_id: to,
            to_code: toOpt.label,
            rate: nextRate,
          };
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...row };
          } else {
            list.push(row);
          }
          return list.sort((a, b) => {
            const fromCmp = a.from_code.localeCompare(b.from_code);
            if (fromCmp !== 0) return fromCmp;
            return a.to_code.localeCompare(b.to_code);
          });
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tenant", "currencies"] });
      message.success(t("exchangeRateSaved"));
    },
    onError: (err) => {
      message.error(err?.message ?? t("exchangeRateSaveError"));
    },
  });

  const addPair = () => {
    const fromId = Number(newFromId);
    const toId = Number(newToId);
    const rate = Number(newRate);
    if (!fromId || !toId || fromId === toId || !Number.isFinite(rate) || rate <= 0) {
      message.error(t("exchangeRateInvalid"));
      return;
    }
    saveMutation.mutate(
      { fromId, toId, rate },
      {
        onSuccess: () => {
          setNewFromId(undefined);
          setNewToId(undefined);
          setNewRate(undefined);
        },
      },
    );
  };

  const fetchFromOnline = async () => {
    const from = currencyOptions.find((o) => Number(o.value) === Number(newFromId));
    const to = currencyOptions.find((o) => Number(o.value) === Number(newToId));
    if (!from || !to) {
      message.error(t("exchangeRateInvalid"));
      return;
    }
    setFetchingOnline(true);
    try {
      const res = await fetchOnlineExchangeRates({
        currencies: [String(from.label), String(to.label)],
        primary_currency_code: String(from.label),
      });
      const rate = res?.rates?.[String(to.label)];
      if (rate == null || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
        message.error(t("fetchOnlineFailed"));
        return;
      }
      setNewRate(Number(rate));
      message.success(t("fetchOnlineSuccess"));
    } catch (err) {
      message.error(err?.message ?? t("fetchOnlineFailed"));
    } finally {
      setFetchingOnline(false);
    }
  };

  const swapNewPair = () => {
    const from = newFromId;
    const to = newToId;
    setNewFromId(to);
    setNewToId(from);
    const currentRate = Number(newRate);
    if (Number.isFinite(currentRate) && currentRate > 0) {
      setNewRate(1 / currentRate);
    }
  };

  /**
   * Selecting the currently selected "to" currency means user wants to swap fields.
   * @param {number} value
   */
  const handleFromChange = (value) => {
    if (newToId != null && Number(value) === Number(newToId)) {
      setNewToId(newFromId);
    }
    setNewFromId(value);
  };

  /**
   * Selecting the currently selected "from" currency means user wants to swap fields.
   * @param {number} value
   */
  const handleToChange = (value) => {
    if (newFromId != null && Number(value) === Number(newFromId)) {
      setNewFromId(newToId);
    }
    setNewToId(value);
  };

  const startEdit = (row) => {
    setEditingKey(row.key);
    setEditRate(Number(row.rate));
  };

  const saveEdit = (row) => {
    const rate = Number(editRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      message.error(t("exchangeRateInvalid"));
      return;
    }
    saveMutation.mutate(
      { fromId: Number(row.from_currency_id), toId: Number(row.to_currency_id), rate },
      {
        onSuccess: () => {
          setEditingKey("");
          setEditRate(undefined);
        },
      },
    );
  };

  const fetchEditRateFromOnline = async (row) => {
    const fromCode = String(row.from_code ?? "");
    const toCode = String(row.to_code ?? "");
    if (!fromCode || !toCode || fromCode === toCode) {
      message.error(t("exchangeRateInvalid"));
      return;
    }

    setFetchingOnline(true);
    try {
      const res = await fetchOnlineExchangeRates({
        currencies: [fromCode, toCode],
        primary_currency_code: fromCode,
      });
      const rate = res?.rates?.[toCode];
      if (rate == null || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
        message.error(t("fetchOnlineFailed"));
        return;
      }
      setEditRate(Number(rate));
      message.success(t("fetchOnlineSuccess"));
    } catch (err) {
      message.error(err?.message ?? t("fetchOnlineFailed"));
    } finally {
      setFetchingOnline(false);
    }
  };

  return (
    <Modal
      title={t("exchangeRatesTitle")}
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" className="!mb-3">
        {t("exchangeRatesHelper")}
      </Typography.Paragraph>

      <Space.Compact block className="mb-3">
        <Select
          className="min-w-[120px]"
          value={newFromId}
          onChange={handleFromChange}
          placeholder={t("pairFrom")}
          options={currencyOptions}
        />
        <Button
          icon={<SwapOutlined />}
          onClick={swapNewPair}
          disabled={!newFromId || !newToId || Number(newFromId) === Number(newToId)}
          aria-label={t("pairSwap")}
          title={t("pairSwap")}
        />
        <Select
          className="min-w-[120px]"
          value={newToId}
          onChange={handleToChange}
          placeholder={t("pairTo")}
          options={currencyOptions}
        />
        <InputNumber
          className="w-full"
          value={newRate}
          onChange={setNewRate}
          min={0.000001}
          step={0.000001}
          controls={false}
          placeholder={t("pairRate")}
        />
        <Button
          onClick={fetchFromOnline}
          loading={fetchingOnline}
          disabled={!newFromId || !newToId || Number(newFromId) === Number(newToId)}
        >
          {t("fetchOnline")}
        </Button>
        <Button type="primary" onClick={addPair} loading={saveMutation.isPending} disabled={hasPair}>
          {hasPair ? t("pairExists") : t("pairAdd")}
        </Button>
      </Space.Compact>

      {pairsLoading ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : pairsRaw.length === 0 ? (
        <Typography.Text type="secondary">{t("pairEmpty")}</Typography.Text>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
          {pairsRaw.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-center gap-2 rounded-md border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <Typography.Text code>{row.from_code}</Typography.Text>
              <span className="text-slate-400">→</span>
              <Typography.Text code>{row.to_code}</Typography.Text>
              <span className="mx-1 text-slate-400">|</span>
              {editingKey === row.key ? (
                <InputNumber
                  min={0.000001}
                  step={0.000001}
                  controls={false}
                  value={editRate}
                  onChange={setEditRate}
                />
              ) : (
                <Typography.Text>{String(row.rate)}</Typography.Text>
              )}
              <div className="ml-auto">
                {editingKey === row.key ? (
                  (() => {
                    const current = Number(row.rate);
                    const draft = Number(editRate);
                    const canSave = Number.isFinite(draft) && draft > 0 && draft !== current;
                    return (
                      <Space>
                        <Button
                          size="small"
                          onClick={() => fetchEditRateFromOnline(row)}
                          loading={fetchingOnline}
                        >
                          {t("fetchOnline")}
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => saveEdit(row)}
                          loading={saveMutation.isPending}
                          disabled={!canSave}
                        >
                          {t("pairSave")}
                        </Button>
                        <Button size="small" onClick={() => setEditingKey("")}>
                          {t("pairCancel")}
                        </Button>
                      </Space>
                    );
                  })()
                ) : (
                  <Button size="small" onClick={() => startEdit(row)}>
                    {t("pairEdit")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

