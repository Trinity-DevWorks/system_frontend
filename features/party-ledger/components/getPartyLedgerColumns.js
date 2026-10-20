import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { Typography } from "antd";

/**
 * Amount plus that row's currency symbol, as in 12.50$ or 12.50LBP.
 * @param {unknown} value
 * @param {unknown} symbol
 */
export function formatLedgerAmount(value, symbol) {
  const amount = formatTenantMoney(value);
  if (!amount) return "\u2014";
  const mark = typeof symbol === "string" ? symbol.trim() : "";
  return mark ? `${amount}${mark}` : amount;
}

/**
 * @param {(key: string) => string} t
 * @param {{
 *   typeLabelKey: Record<string, string>;
 *   showCurrency?: boolean;
 *   onOpen?: (record: Record<string, unknown>) => void;
 * }} options
 */
export function getPartyLedgerColumns(t, { typeLabelKey, showCurrency = false, onOpen }) {
  return [
    {
      title: t("colDate"),
      dataIndex: "transaction_date",
      key: "transaction_date",
      width: 120,
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    ...(showCurrency
      ? [
          {
            title: t("colCurrency"),
            dataIndex: "currency_code",
            key: "currency_code",
            width: 110,
            render: (value) => value || "\u2014",
          },
        ]
      : []),
    {
      title: t("colType"),
      dataIndex: "reference_type",
      key: "reference_type",
      width: 220,
      render: (value, record) => {
        const key = typeLabelKey[String(value)] ?? "typeUnknown";
        const label = t(key);
        return record?.reversed ? `${label} ${t("reversed")}` : label;
      },
    },
    {
      title: t("colDocument"),
      dataIndex: "document_number",
      key: "document_number",
      width: 160,
      render: (value, record) => {
        if (!value) return "\u2014";
        if (!onOpen || !record?.reference_id) {
          return (
            <Typography.Text code className="text-xs">
              {value}
            </Typography.Text>
          );
        }
        return (
          <Typography.Link
            onClick={(event) => {
              event.stopPropagation();
              onOpen(/** @type {Record<string, unknown>} */ (record));
            }}
          >
            {value}
          </Typography.Link>
        );
      },
    },
    {
      title: t("colDebit"),
      dataIndex: "debit",
      key: "debit",
      width: 140,
      align: "right",
      render: (value, record) => formatLedgerAmount(value, record?.currency_symbol),
    },
    {
      title: t("colCredit"),
      dataIndex: "credit",
      key: "credit",
      width: 140,
      align: "right",
      render: (value, record) => formatLedgerAmount(value, record?.currency_symbol),
    },
    {
      title: t("colBalance"),
      dataIndex: "running_balance",
      key: "running_balance",
      width: 150,
      align: "right",
      render: (value, record) => formatLedgerAmount(value, record?.currency_symbol),
    },
  ];
}
