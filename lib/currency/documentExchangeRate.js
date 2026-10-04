/**
 * Document exchange rate: 1 primary currency = rate × document currency.
 * Item and supplier prices are stored in the primary currency, so
 * document price = primary price × rate.
 *
 * Used by sales/purchase invoice drawers and the payment document drawer.
 */

export const EXCHANGE_RATE_DECIMALS = 12;

/**
 * @param {number} value
 * @param {number} decimals
 */
function roundTo(value, decimals) {
  return Number(value.toFixed(Math.max(0, decimals)));
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function positiveRate(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Rate for `currencyId` relative to the primary currency, from stored pair rates.
 * Uses the direct primary → currency pair, else the inverse of currency → primary.
 *
 * @param {Array<{ from_currency_id?: unknown; to_currency_id?: unknown; rate?: unknown }>} pairRates
 * @param {number | string | null | undefined} primaryCurrencyId
 * @param {number | string | null | undefined} currencyId
 * @returns {number | null}
 */
export function rateFromPrimary(pairRates, primaryCurrencyId, currencyId) {
  if (currencyId == null || primaryCurrencyId == null) return null;
  if (Number(currencyId) === Number(primaryCurrencyId)) return 1;
  const rows = Array.isArray(pairRates) ? pairRates : [];

  const direct = rows.find(
    (row) =>
      Number(row.from_currency_id) === Number(primaryCurrencyId) && Number(row.to_currency_id) === Number(currencyId),
  );
  const directRate = positiveRate(direct?.rate);
  if (directRate != null) return roundTo(directRate, EXCHANGE_RATE_DECIMALS);

  const reverse = rows.find(
    (row) =>
      Number(row.from_currency_id) === Number(currencyId) && Number(row.to_currency_id) === Number(primaryCurrencyId),
  );
  const reverseRate = positiveRate(reverse?.rate);
  if (reverseRate != null) return roundTo(1 / reverseRate, EXCHANGE_RATE_DECIMALS);

  return null;
}

/**
 * Re-express a price from one document rate to another (primary price × rate).
 *
 * @param {unknown} price
 * @param {unknown} fromRate rate the price is currently expressed in (1 = primary)
 * @param {unknown} toRate
 * @param {number} priceDecimals
 * @returns {number | null}
 */
export function convertPriceBetweenRates(price, fromRate, toRate, priceDecimals) {
  if (price == null || price === "") return null;
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  const from = positiveRate(fromRate) ?? 1;
  const to = positiveRate(toRate) ?? 1;
  if (from === to) return roundTo(n, priceDecimals);
  return roundTo((n / from) * to, priceDecimals);
}

/**
 * Line price tracking (client only, never sent to the API):
 * - `price_rate`: rate the line's `unit_price` is expressed in; `undefined` = not tracked.
 * - `price_base`: primary-currency source price (catalog, PO or GRN), when known.
 * - `price_source`: "catalog" | "document" | "saved" | "manual". Manual prices are never repriced.
 */
export const UNTRACKED_LINE_PRICE = Object.freeze({
  price_base: undefined,
  price_rate: undefined,
  price_source: undefined,
});

/**
 * Line fields for a primary-currency source price at the document rate.
 * With no rate yet the price stays empty until "Update prices" runs.
 *
 * @param {unknown} primaryPrice
 * @param {unknown} rate
 * @param {number} priceDecimals
 * @param {"catalog" | "document"} [source]
 */
export function linePriceFromPrimary(primaryPrice, rate, priceDecimals, source = "catalog") {
  const base = primaryPrice == null || primaryPrice === "" ? NaN : Number(primaryPrice);
  if (!Number.isFinite(base)) {
    return { unit_price: undefined, ...UNTRACKED_LINE_PRICE };
  }
  const r = positiveRate(rate);
  return {
    unit_price: r == null ? undefined : roundTo(base * r, priceDecimals),
    price_base: base,
    price_rate: r,
    price_source: source,
  };
}

/**
 * @param {unknown} value
 * @param {unknown} rate
 */
export function manualLinePrice(value, rate) {
  return {
    unit_price: value == null || value === "" ? undefined : Number(value),
    price_base: undefined,
    price_rate: positiveRate(rate) ?? undefined,
    price_source: "manual",
  };
}

/**
 * @param {{ item_id?: unknown; unit_price?: unknown; price_base?: unknown; price_rate?: unknown; price_source?: unknown }} line
 * @param {unknown} rate
 */
export function lineAwaitsRateUpdate(line, rate) {
  const r = positiveRate(rate);
  if (r == null || !line || line.item_id == null || line.item_id === "") return false;
  if (line.price_source === "manual" || line.price_rate === undefined) return false;
  if (line.price_rate === null) return line.price_base != null;
  if (sameRate(line.price_rate, r)) return false;
  return line.price_base != null || (line.unit_price != null && line.unit_price !== "");
}

/**
 * Typed price expressed at a rate other than the header's — kept as typed.
 *
 * @param {{ item_id?: unknown; price_rate?: unknown; price_source?: unknown }} line
 * @param {unknown} rate
 */
export function manualLineAtOtherRate(line, rate) {
  const r = positiveRate(rate);
  if (r == null || !line || line.item_id == null || line.item_id === "") return false;
  if (line.price_source !== "manual" || positiveRate(line.price_rate) == null) return false;
  return !sameRate(line.price_rate, r);
}

/**
 * @template {{ unit_price?: unknown; price_base?: unknown; price_rate?: unknown }} T
 * @param {T} line
 * @param {unknown} rate
 * @param {number} priceDecimals
 * @returns {T}
 */
export function lineAtRate(line, rate, priceDecimals) {
  const r = positiveRate(rate);
  if (r == null) return line;
  const unitPrice =
    line.price_base != null
      ? roundTo(Number(line.price_base) * r, priceDecimals)
      : convertPriceBetweenRates(line.unit_price, line.price_rate, r, priceDecimals);
  return { ...line, unit_price: unitPrice ?? undefined, price_rate: r };
}

/**
 * Primary-currency equivalent of a document price.
 *
 * @param {unknown} price
 * @param {unknown} rate
 * @returns {number | null}
 */
export function priceInPrimary(price, rate) {
  if (price == null || price === "") return null;
  const n = Number(price);
  const r = positiveRate(rate);
  if (!Number.isFinite(n) || r == null) return null;
  return n / r;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
export function sameRate(a, b) {
  const x = positiveRate(a) ?? 1;
  const y = positiveRate(b) ?? 1;
  return Math.abs(x - y) <= 10 ** -EXCHANGE_RATE_DECIMALS * Math.max(1, Math.abs(x), Math.abs(y));
}

/**
 * Invoice-currency amount settled by a payment-currency amount.
 * Both rates mean 1 primary = rate × that currency.
 *
 * @param {unknown} amount
 * @param {unknown} paymentRate
 * @param {unknown} invoiceRate
 * @param {boolean} sameCurrency
 * @param {number} decimals
 * @returns {number | null}
 */
export function paymentAppliedToInvoice(amount, paymentRate, invoiceRate, sameCurrency, decimals) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (sameCurrency) return roundTo(n, decimals);
  const payment = positiveRate(paymentRate);
  const invoice = positiveRate(invoiceRate);
  if (payment == null || invoice == null) return null;
  return roundTo((n / payment) * invoice, decimals);
}

/**
 * Payment-currency amount that settles an open invoice balance.
 *
 * @param {unknown} openAmount
 * @param {unknown} paymentRate
 * @param {unknown} invoiceRate
 * @param {boolean} sameCurrency
 * @param {number} decimals
 * @returns {number | null}
 */
export function paymentAmountForInvoiceOpen(openAmount, paymentRate, invoiceRate, sameCurrency, decimals) {
  const open = Number(openAmount);
  if (!Number.isFinite(open)) return null;
  if (sameCurrency) return roundTo(Math.max(0, open), decimals);
  const payment = positiveRate(paymentRate);
  const invoice = positiveRate(invoiceRate);
  if (payment == null || invoice == null) return null;
  return roundTo(Math.max(0, (open / invoice) * payment), decimals);
}
