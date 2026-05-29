import { drawerSelectGetPopup } from "@/components/resource-drawer/drawerFormUtils";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, Radio, Select, Space } from "antd";
import { PANEL_ACTIONS_CELL_STYLE } from "../shared/panelTableStyles";
import { SUPPLIER_DRAFT_ROW_ID } from "./supplierPanelConstants";

/**
 * @param {Record<string, unknown>} ctx
 */
export function buildSuppliersPanelColumns(ctx) {
  const {
    t,
    readOnly,
    inlineEdit,
    supplierOptions,
    currencyOptions,
    getInlineValues,
    patchDraft,
    patchPreferred,
    patchMutationPending,
    saveMutationPending,
    saveInline,
    cancelInline,
    startEditRow,
    deleteMutation,
    modal,
  } = ctx;

  return [
    {
      title: t("supplierColIndex"),
      key: "index",
      width: 35,
      align: "center",
      render: (_v, r, index) => (r.id === SUPPLIER_DRAFT_ROW_ID ? "—" : index + 1),
    },
    {
      title: t("supplierColName"),
      key: "supplier",
      width: 160,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft && r.id === SUPPLIER_DRAFT_ROW_ID) {
          return (
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              className="w-full min-w-0"
              placeholder={t("supplierFieldSupplier")}
              value={draft.supplier_id}
              options={supplierOptions}
              onChange={(supplier_id) => patchDraft({ supplier_id: supplier_id ?? undefined })}
              getPopupContainer={drawerSelectGetPopup}
              popupMatchSelectWidth={false}
              listHeight={280}
            />
          );
        }
        return r.supplier?.name ?? r.supplier?.supplier_code ?? "—";
      },
    },
    {
      title: t("supplierColSku"),
      key: "sku",
      width: 120,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Input
              size="small"
              value={draft.supplier_sku}
              onChange={(e) => patchDraft({ supplier_sku: e.target.value })}
            />
          );
        }
        return r.supplier_sku ?? "—";
      },
    },
    {
      title: t("supplierColPrice"),
      key: "price",
      width: 100,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <InputNumber
              size="small"
              className="w-full min-w-0"
              min={0}
              value={draft.last_purchase_price}
              onChange={(last_purchase_price) =>
                patchDraft({ last_purchase_price: last_purchase_price ?? undefined })
              }
            />
          );
        }
        return r.last_purchase_price ?? "—";
      },
    },
    {
      title: t("supplierColCurrency"),
      key: "currency",
      width: 100,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Select
              size="small"
              allowClear
              className="w-full min-w-0"
              placeholder={t("supplierFieldCurrency")}
              value={draft.currency_id}
              options={currencyOptions}
              onChange={(currency_id) => patchDraft({ currency_id: currency_id ?? undefined })}
              getPopupContainer={drawerSelectGetPopup}
              popupMatchSelectWidth={false}
              listHeight={280}
            />
          );
        }
        return r.currency?.code ?? r.currency?.name ?? "—";
      },
    },
    {
      title: t("supplierColLead"),
      key: "lead",
      width: 90,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <InputNumber
              size="small"
              className="w-full min-w-0"
              min={0}
              value={draft.lead_time_days}
              onChange={(lead_time_days) => patchDraft({ lead_time_days: lead_time_days ?? undefined })}
            />
          );
        }
        return r.lead_time_days != null ? r.lead_time_days : "—";
      },
    },
    {
      title: t("supplierColPreferred"),
      key: "pref",
      width: 80,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return <Radio checked={draft.is_preferred} onChange={() => patchDraft({ is_preferred: true })} />;
        }
        return (
          <Radio
            checked={Boolean(r.is_preferred)}
            disabled={readOnly || patchMutationPending || Boolean(inlineEdit)}
            onChange={() => patchPreferred(r)}
          />
        );
      },
    },
    {
      title: t("supplierColActions"),
      key: "actions",
      width: 88,
      align: "center",
      fixed: "right",
      onHeaderCell: () => ({ className: "resource-drawer-actions-header", style: PANEL_ACTIONS_CELL_STYLE }),
      onCell: () => ({ className: "resource-drawer-actions-cell", style: PANEL_ACTIONS_CELL_STYLE }),
      render: (_v, r) => {
        if (readOnly) return null;
        if (getInlineValues(r)) {
          return (
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                aria-label={t("uomInlineSave")}
                loading={saveMutationPending}
                onClick={saveInline}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                aria-label={t("uomInlineCancel")}
                disabled={saveMutationPending}
                onClick={cancelInline}
              />
            </Space>
          );
        }
        if (r.id === SUPPLIER_DRAFT_ROW_ID) return null;
        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              aria-label={t("supplierModalEdit")}
              disabled={Boolean(inlineEdit)}
              onClick={() => startEditRow(r)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={t("panelDeleteConfirm")}
              disabled={Boolean(inlineEdit)}
              onClick={() =>
                modal.confirm({
                  title: t("panelDeleteConfirm"),
                  onOk: () =>
                    deleteMutation.mutateAsync({
                      supplierId: Number(r.supplier_id ?? r.supplier?.id),
                      id: Number(r.id),
                    }),
                })
              }
            />
          </Space>
        );
      },
    },
  ];
}
