"use client";

import { formatTenantNumber } from "@/lib/tenant-format";
import { Alert, Divider, InputNumber, Table } from "antd";
import { landedCostMoney } from "../../utils/landedCostDrawerUtils";

/**
 * How the charges land on each received line: added cost, per unit, and the new landed unit cost.
 * Manual charges get an input column per charge.
 *
 * @param {{
 *   t: (key: string) => string;
 *   readOnly: boolean;
 *   view: Record<string, any> | null;
 *   loading: boolean;
 *   previewError: string | null;
 *   charges: import("../../utils/landedCostDrawerUtils").LandedCostCharge[];
 *   onPatchCharge: (index: number, patch: Partial<import("../../utils/landedCostDrawerUtils").LandedCostCharge>) => void;
 * }} props
 */
export default function LandedCostAllocationTable({ t, readOnly, view, loading, previewError, charges, onPatchCharge }) {
  const lines = /** @type {Array<Record<string, any>>} */ (view?.lines ?? []);
  const manualCharges = charges.map((c, index) => ({ c, index })).filter(({ c }) => c.method === "manual");
  // Manual shares must add up to the charge before saving; show which ones do not yet.
  const unbalanced = readOnly
    ? []
    : manualCharges.filter(({ c }) => {
        const sum = Object.values(c.manual ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
        return Math.abs(sum - (Number(c.amount) || 0)) > 0.00005;
      });

  const columns = [
    { title: t("colReceipt"), dataIndex: "receipt_number", key: "receipt", width: 150 },
    { title: t("colItem"), key: "item", ellipsis: true, render: (_, r) => [r.item_code, r.item_name].filter(Boolean).join(" — ") },
    {
      title: t("colQuantity"),
      dataIndex: "received_quantity",
      key: "qty",
      align: "right",
      width: 100,
      render: (v) => formatTenantNumber(v, { decimals: 3, trimTrailingZeros: true }),
    },
    { title: t("colUnitCost"), dataIndex: "unit_cost", key: "unit_cost", align: "right", width: 120, render: landedCostMoney },
    ...manualCharges.map(({ c, index }) => ({
      title: `${t("colManual")} · ${c.document_number ?? ""}`,
      key: `manual-${index}`,
      width: 150,
      render: (_, r) => (
        <InputNumber
          size="small"
          min={0}
          className="w-full"
          disabled={readOnly}
          value={c.manual?.[r.key] ?? null}
          onChange={(v) => onPatchCharge(index, { manual: { ...c.manual, [r.key]: Number(v ?? 0) } })}
        />
      ),
    })),
    { title: t("colAdded"), dataIndex: "added_amount", key: "added", align: "right", width: 130, render: landedCostMoney },
    { title: t("colAddedPerUnit"), dataIndex: "added_per_unit", key: "per_unit", align: "right", width: 130, render: landedCostMoney },
    {
      title: t("colLandedUnitCost"),
      dataIndex: "landed_unit_cost",
      key: "landed",
      align: "right",
      width: 150,
      render: (v) => <strong>{landedCostMoney(v)}</strong>,
    },
  ];

  return (
    <section>
      <Divider titlePlacement="start">{t("sectionAllocation")}</Divider>
      {previewError ? <Alert type="warning" showIcon className="mb-2" title={previewError} /> : null}
      {unbalanced.map(({ c, index }) => {
        const sum = Object.values(c.manual ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
        return (
          <Alert
            key={`manual-${index}`}
            type="warning"
            showIcon
            className="mb-2"
            title={t("manualUnbalanced", { document: c.document_number ?? "", shares: landedCostMoney(sum), amount: landedCostMoney(c.amount) })}
          />
        );
      })}
      <Table
        size="small"
        rowKey="key"
        loading={loading}
        columns={columns}
        dataSource={lines}
        pagination={false}
        scroll={{ x: 1000 }}
        locale={{ emptyText: t("noLines") }}
        summary={() =>
          view ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={columns.length - 3}>
                <strong>{t("totalCharges")}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{landedCostMoney(view.total_amount)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={2} />
            </Table.Summary.Row>
          ) : null
        }
      />
    </section>
  );
}
