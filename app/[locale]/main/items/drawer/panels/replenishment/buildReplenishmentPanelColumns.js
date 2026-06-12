import { drawerSelectGetPopup } from "@/components/resource-drawer/drawerFormUtils";
import { formatStockQuantity } from "@/app/[locale]/main/stock/shared/formatStockQuantity";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Checkbox, InputNumber, Select, Space, Tag } from "antd";
import { PANEL_ACTIONS_CELL_STYLE } from "../shared/panelTableStyles";
import { REPLENISHMENT_DRAFT_ROW_ID } from "./replenishmentPanelConstants";

/**
 * @param {Record<string, unknown>} ctx
 */
export function buildReplenishmentPanelColumns(ctx) {
  const {
    t,
    readOnly,
    inlineEdit,
    warehouseOptions,
    getInlineValues,
    patchDraft,
    saveMutationPending,
    saveInline,
    cancelInline,
    startEditRow,
    deleteMutation,
    modal,
  } = ctx;

  const qtyCell = (draft, field, min = 0) => (
    <InputNumber
      size="small"
      className="w-full min-w-0"
      min={min}
      step={0.01}
      value={draft[field]}
      onChange={(v) => patchDraft({ [field]: v ?? undefined })}
    />
  );

  return [
    {
      title: t("replenishmentColWarehouse"),
      key: "warehouse",
      width: 160,
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft && r.id === REPLENISHMENT_DRAFT_ROW_ID) {
          return (
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              className="w-full min-w-0"
              placeholder={t("replenishmentFieldWarehouse")}
              value={draft.warehouse_id}
              options={warehouseOptions}
              onChange={(warehouse_id) => patchDraft({ warehouse_id: warehouse_id ?? undefined })}
              getPopupContainer={drawerSelectGetPopup}
              popupMatchSelectWidth={false}
              listHeight={280}
            />
          );
        }
        const w = r.warehouse;
        if (!w) return "—";
        const shortcut = typeof w.shortcut_name === "string" ? w.shortcut_name.trim() : "";
        const name = typeof w.name === "string" ? w.name : "";
        return shortcut ? `${shortcut} — ${name}` : name || "—";
      },
    },
    {
      title: t("replenishmentColSafety"),
      key: "safety",
      width: 100,
      align: "right",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) return qtyCell(draft, "safety_stock_qty");
        return formatStockQuantity(r.safety_stock_qty);
      },
    },
    {
      title: t("replenishmentColReorderPoint"),
      key: "reorder_point",
      width: 110,
      align: "right",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) return qtyCell(draft, "reorder_point_qty");
        return formatStockQuantity(r.reorder_point_qty);
      },
    },
    {
      title: t("replenishmentColReorderQty"),
      key: "reorder_qty",
      width: 110,
      align: "right",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) return qtyCell(draft, "reorder_qty");
        return r.reorder_qty != null ? formatStockQuantity(r.reorder_qty) : "—";
      },
    },
    {
      title: t("replenishmentColMaxQty"),
      key: "max_qty",
      width: 100,
      align: "right",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) return qtyCell(draft, "max_qty");
        return r.max_qty != null ? formatStockQuantity(r.max_qty) : "—";
      },
    },
    {
      title: t("replenishmentColLeadTime"),
      key: "lead_time",
      width: 90,
      align: "right",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <InputNumber
              size="small"
              className="w-full min-w-0"
              min={0}
              value={draft.lead_time_days}
              onChange={(v) => patchDraft({ lead_time_days: v ?? undefined })}
            />
          );
        }
        return r.lead_time_days != null ? r.lead_time_days : "—";
      },
    },
    {
      title: t("replenishmentColMethod"),
      key: "method",
      width: 110,
      render: (_v, r) => {
        const method = r.replenishment_method;
        if (method === "min_max") {
          return <Tag className="!m-0">{t("replenishmentMethodMinMax")}</Tag>;
        }
        return <Tag className="!m-0">{t("replenishmentMethodReorderPoint")}</Tag>;
      },
    },
    {
      title: t("replenishmentColActive"),
      key: "active",
      width: 70,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Checkbox
              checked={draft.is_active}
              onChange={(e) => patchDraft({ is_active: e.target.checked })}
            />
          );
        }
        return r.is_active ? t("yes") : t("no");
      },
    },
    {
      title: t("replenishmentColActions"),
      key: "actions",
      width: 120,
      fixed: "right",
      onCell: () => ({ style: PANEL_ACTIONS_CELL_STYLE }),
      render: (_v, r) => {
        if (readOnly) return null;
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                loading={saveMutationPending}
                onClick={saveInline}
              />
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                disabled={saveMutationPending}
                onClick={cancelInline}
              />
            </Space>
          );
        }
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              disabled={Boolean(inlineEdit)}
              onClick={() => startEditRow(r)}
            />
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={Boolean(inlineEdit)}
              onClick={() =>
                modal.confirm({
                  title: t("replenishmentDeleteConfirm"),
                  okType: "danger",
                  onOk: () => deleteMutation.mutateAsync(Number(r.id)),
                })
              }
            />
          </Space>
        );
      },
    },
  ];
}
