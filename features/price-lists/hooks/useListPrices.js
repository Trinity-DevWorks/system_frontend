"use client";

import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { resolvePrices } from "../api/priceLists.api";

/**
 * Applies price list prices to sales document lines.
 *
 * Lines keep getting their instant catalog default from the editor (price_source "catalog").
 * This hook then asks the server which price applies (customer -> group -> branch -> default list)
 * and swaps in the list price. Lines priced by hand ("manual") or loaded from a saved document
 * ("saved") are never touched. A list-priced line is re-checked when its quantity, unit, customer,
 * currency, rate or date changes (quantity breaks, other customer's list).
 *
 * @param {{
 *   lines: Array<Record<string, any>>;
 *   setLines: (updater: (prev: Array<Record<string, any>>) => Array<Record<string, any>>) => void;
 *   customerId: unknown;
 *   currencyId: unknown;
 *   exchangeRate: unknown;
 *   date: unknown;
 *   enabled: boolean;
 * }} args
 */
export function useListPrices({ lines, setLines, customerId, currencyId, exchangeRate, date, enabled }) {
  const inflight = useRef(/** @type {Map<number, string>} */ (new Map()));

  useEffect(() => {
    if (!enabled || currencyId == null || currencyId === "") return undefined;
    const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 1;
    const day = date ? dayjs(/** @type {any} */ (date)) : null;
    const dateString = day && day.isValid() ? day.format("YYYY-MM-DD") : null;

    /** @type {Array<{ index: number; key: string; line: Record<string, any> }>} */
    const pending = [];
    lines.forEach((line, index) => {
      if (!line || line.item_id == null || line.item_id === "") return;
      const eligible = line.price_source === "catalog" || (line.price_source === "document" && line.price_list_code);
      if (!eligible) return;
      const key = [customerId ?? "", currencyId, rate, dateString ?? "", line.item_id, line.item_uom_id ?? "", line.quantity ?? ""].join("|");
      if (line.price_key === key || inflight.current.get(index) === key) return;
      pending.push({ index, key, line });
    });
    if (pending.length === 0) return undefined;

    const timer = setTimeout(() => {
      pending.forEach((p) => inflight.current.set(p.index, p.key));
      resolvePrices({
        customer_id: customerId ? String(customerId) : null,
        currency_id: Number(currencyId),
        exchange_rate: rate,
        date: dateString,
        lines: pending.map((p) => ({
          item_id: String(p.line.item_id),
          item_uom_id: p.line.item_uom_id != null && p.line.item_uom_id !== "" ? Number(p.line.item_uom_id) : null,
          quantity: p.line.quantity != null && p.line.quantity !== "" ? Number(p.line.quantity) : 1,
        })),
      })
        .then((rows) => {
          const results = Array.isArray(rows) ? rows : [];
          setLines((prev) =>
            prev.map((line, index) => {
              const at = pending.findIndex((p) => p.index === index);
              if (at < 0) return line;
              const p = pending[at];
              const same =
                String(line.item_id ?? "") === String(p.line.item_id ?? "") &&
                String(line.item_uom_id ?? "") === String(p.line.item_uom_id ?? "") &&
                String(line.quantity ?? "") === String(p.line.quantity ?? "");
              const stillAuto = line.price_source === "catalog" || (line.price_source === "document" && line.price_list_code);
              if (!same || !stillAuto) return line;
              const r = results[at];
              const fromList = r && r.unit_price != null && r.price_source !== "catalog" && r.price_source !== "none";
              if (!fromList) {
                return { ...line, price_key: p.key };
              }
              return {
                ...line,
                unit_price: Number(r.unit_price),
                price_base: undefined,
                price_rate: rate,
                price_source: "document",
                price_list_code: r.price_source,
                price_key: p.key,
                line_total: undefined,
              };
            }),
          );
        })
        .catch(() => {})
        .finally(() => {
          pending.forEach((p) => {
            if (inflight.current.get(p.index) === p.key) inflight.current.delete(p.index);
          });
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [lines, setLines, customerId, currencyId, exchangeRate, date, enabled]);
}
