import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Radio, Select, Space, Tag } from "antd";
import { PANEL_ACTIONS_CELL_STYLE } from "../shared/panelTableStyles";
import { UOM_DRAFT_ROW_ID } from "./uomsPanelConstants";

/**
 * @param {Record<string, unknown>} ctx
 */
export function buildUomsPanelColumns(ctx) {
  const {
    t,
    readOnly,
    inlineEdit,
    uomOptions,
    currencyOptions,
    uomsQueryPending,
    currenciesQueryPending,
    getInlineValues,
    patchDraft,
    patchFlag,
    saveMutationPending,
    saveInline,
    cancelInline,
    startEditRow,
    deleteMutation,
    modal,
  } = ctx;

  const renderUomCell = (_v, r) => {
    const draft = getInlineValues(r);
    if (draft) {
      return (
        <Select
          size="small"
          className="w-full min-w-0"
          placeholder={t("uomFieldUom")}
          value={draft.uom_id}
          disabled={inlineEdit?.key !== "new"}
          options={uomOptions}
          loading={uomsQueryPending}
          onChange={(uom_id) => patchDraft({ uom_id })}
          showSearch
          optionFilterProp="label"
          getPopupContainer={drawerSelectGetPopup}
          popupMatchSelectWidth={false}
          listHeight={280}
        />
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span>{r.uom?.name ?? r.uom?.code ?? "—"}</span>
        {r.is_base ? (
          <Tag color="green" variant="filled" className="!m-0 text-xs">
            {t("uomFlagBase")}
          </Tag>
        ) : null}
      </div>
    );
  };

  const renderPriceCell = (field, _v, r) => {
    const draft = getInlineValues(r);
    if (draft) {
      return (
        <TenantNumberInput
          kind="money"
          size="small"
          className="w-full"
          min={0}
          value={draft[field]}
          onChange={(v) => patchDraft({ [field]: v ?? undefined })}
        />
      );
    }
    return formatTenantMoney(r[field]) || "—";
  };

  return [
    {
      title: t("uomColIndex"),
      key: "index",
      width: 35,
      align: "center",
      render: (_v, r, i) => (r.id === UOM_DRAFT_ROW_ID ? "—" : i + 1),
    },
    { title: t("uomColUom"), key: "uom", width: 120, align: "center", render: renderUomCell },
    {
      title: t("uomColFactor"),
      key: "factor",
      width: 120,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <TenantNumberInput
              kind="quantity"
              size="small"
              className="w-full"
              min={0.000001}
              step={0.01}
              value={draft.conversion_factor}
              onChange={(v) => patchDraft({ conversion_factor: Number(v ?? 1) })}
            />
          );
        }
        return (
          formatTenantNumber(r.conversion_factor, {
            decimals: 6,
            trimTrailingZeros: true,
          }) || "—"
        );
      },
    },
    {
      title: t("uomColBarcode"),
      key: "barcode",
      width: 120,
      align: "center",
      ellipsis: true,
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Input
              size="small"
              value={draft.barcode}
              onChange={(e) => patchDraft({ barcode: e.target.value })}
            />
          );
        }
        return r.barcode ?? "—";
      },
    },
    {
      title: t("uomColSell"),
      key: "sell",
      width: 100,
      align: "center",
      render: (_v, r) => renderPriceCell("selling_price", _v, r),
    },
    {
      title: t("uomColCost"),
      key: "cost",
      width: 100,
      align: "center",
      render: (_v, r) => renderPriceCell("cost_price", _v, r),
    },
    {
      title: t("uomColTakeaway"),
      key: "takeaway",
      width: 100,
      align: "center",
      render: (_v, r) => renderPriceCell("takeaway_price", _v, r),
    },
    {
      title: t("uomColDineIn"),
      key: "dineIn",
      width: 100,
      align: "center",
      render: (_v, r) => renderPriceCell("dine_in_price", _v, r),
    },
    {
      title: t("uomColDelivery"),
      key: "delivery",
      width: 100,
      align: "center",
      render: (_v, r) => renderPriceCell("delivery_price", _v, r),
    },
    {
      title: t("uomColCurrency"),
      key: "currency",
      width: 80,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Select
              size="small"
              allowClear
              className="w-full min-w-0"
              placeholder={t("uomFieldCurrency")}
              value={draft.currency_id}
              options={currencyOptions}
              loading={currenciesQueryPending}
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
      title: t("uomColBase"),
      key: "base",
      width: 64,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return <Radio checked={draft.is_base} onChange={() => patchDraft({ is_base: true })} />;
        }
        return (
          <Radio
            checked={Boolean(r.is_base)}
            disabled={readOnly || Boolean(inlineEdit)}
            onChange={() => patchFlag(Number(r.id), { is_base: true })}
          />
        );
      },
    },
    {
      title: t("uomColDefaultSale"),
      key: "defaultSale",
      width: 80,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Checkbox
              checked={draft.is_default_sale}
              onChange={(e) => patchDraft({ is_default_sale: e.target.checked })}
            />
          );
        }
        return (
          <Checkbox
            checked={Boolean(r.is_default_sale)}
            disabled={readOnly || Boolean(inlineEdit)}
            onChange={(e) => patchFlag(Number(r.id), { is_default_sale: e.target.checked })}
          />
        );
      },
    },
    {
      title: t("uomColDefaultPurchase"),
      key: "defaultPurchase",
      width: 80,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Checkbox
              checked={draft.is_default_purchase}
              onChange={(e) => patchDraft({ is_default_purchase: e.target.checked })}
            />
          );
        }
        return (
          <Checkbox
            checked={Boolean(r.is_default_purchase)}
            disabled={readOnly || Boolean(inlineEdit)}
            onChange={(e) => patchFlag(Number(r.id), { is_default_purchase: e.target.checked })}
          />
        );
      },
    },
    {
      title: t("uomColActions"),
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
        if (r.id === UOM_DRAFT_ROW_ID) return null;
        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              aria-label={t("uomModalEdit")}
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
                  onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(Number(r.id))),
                })
              }
            />
          </Space>
        );
      },
    },
  ];
}
