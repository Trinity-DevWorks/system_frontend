"use client";

import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { DeleteOutlined } from "@ant-design/icons";
import { Button, Divider, Empty, InputNumber, Select, Table } from "antd";
import { LANDED_COST_METHODS, chargeKey, landedCostMoney } from "../../utils/landedCostDrawerUtils";

/**
 * Freight / customs charges taken into this landed cost, with the amount and split method of each.
 *
 * @param {{
 *   t: (key: string) => string;
 *   readOnly: boolean;
 *   charges: import("../../utils/landedCostDrawerUtils").LandedCostCharge[];
 *   chargeOptions: Array<{ value: string; label: string; row: Record<string, any> }>;
 *   chargesPending: boolean;
 *   onAddCharge: (value: string, option: unknown) => void;
 *   onPatchCharge: (index: number, patch: Partial<import("../../utils/landedCostDrawerUtils").LandedCostCharge>) => void;
 *   onRemoveCharge: (index: number) => void;
 *   splitColumn?: { title: string; render: (charge: import("../../utils/landedCostDrawerUtils").LandedCostCharge) => import("react").ReactNode } | null;
 * }} props
 */
export default function LandedCostChargesEditor({
  t,
  readOnly,
  charges,
  chargeOptions,
  chargesPending,
  onAddCharge,
  onPatchCharge,
  onRemoveCharge,
  splitColumn = null,
}) {
  const columns = [
    { title: t("colDocument"), key: "doc", width: 170, render: (_, c) => c.document_number ?? "—" },
    { title: t("colDescription"), key: "desc", ellipsis: true, render: (_, c) => [c.description, c.party].filter(Boolean).join(" · ") },
    { title: t("openAmount"), key: "open", align: "right", width: 130, render: (_, c) => landedCostMoney(c.open_amount) },
    {
      title: t("colAmount"),
      key: "amount",
      width: 150,
      render: (_, c, index) => (
        <InputNumber
          size="small"
          min={0}
          max={Number(c.open_amount ?? Infinity)}
          className="w-full"
          disabled={readOnly}
          value={c.amount}
          onChange={(v) => onPatchCharge(index, { amount: v == null ? null : Number(v) })}
        />
      ),
    },
    {
      title: t("colMethod"),
      key: "method",
      width: 170,
      render: (_, c, index) => (
        <Select
          size="small"
          className="w-full"
          disabled={readOnly}
          value={c.method}
          onChange={(v) => onPatchCharge(index, { method: v, manual: {} })}
          options={LANDED_COST_METHODS.map((m) => ({ value: m, label: t(`method_${m}`) }))}
          getPopupContainer={drawerSelectGetPopup}
        />
      ),
    },
    ...(splitColumn ? [{ title: splitColumn.title, key: "split", width: 220, render: (_, c) => splitColumn.render(c) }] : []),
    ...(!readOnly
      ? [
          {
            title: "",
            key: "remove",
            width: 48,
            render: (_, __, index) => (
              <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={t("actionDelete")} onClick={() => onRemoveCharge(index)} />
            ),
          },
        ]
      : []),
  ];

  return (
    <section>
      <Divider titlePlacement="start" className="!mt-2">
        {t("sectionCharges")}
      </Divider>
      {!readOnly ? (
        <Select
          className="mb-2 w-full"
          showSearch
          optionFilterProp="label"
          placeholder={t("chargesPlaceholder")}
          loading={chargesPending}
          value={null}
          onChange={onAddCharge}
          options={chargeOptions}
          getPopupContainer={drawerSelectGetPopup}
          notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noOpenCharges")} />}
        />
      ) : null}
      <Table
        size="small"
        rowKey={(c) => chargeKey(c)}
        columns={columns}
        dataSource={charges}
        pagination={false}
        scroll={{ x: 900 }}
        locale={{ emptyText: t("noCharges") }}
      />
    </section>
  );
}
