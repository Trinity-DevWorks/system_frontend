import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Input, Radio, Select, Space } from "antd";
import { PANEL_ACTIONS_CELL_STYLE } from "../shared/panelTableStyles";
import { BARCODE_DRAFT_ROW_ID } from "./barcodePanelConstants";

/**
 * @param {{
 *   t: (k: string) => string;
 *   readOnly: boolean;
 *   inlineEdit: unknown;
 *   itemUomOptions: { value: number; label: string }[];
 *   getInlineValues: (row: Record<string, unknown>) => unknown;
 *   patchDraft: (patch: Record<string, unknown>) => void;
 *   patchPrimary: (id: number) => void;
 *   patchMutationPending: boolean;
 *   saveMutationPending: boolean;
 *   saveInline: () => void;
 *   cancelInline: () => void;
 *   startEditRow: (row: Record<string, unknown>) => void;
 *   deleteMutation: { mutateAsync: (id: number) => Promise<unknown> };
 *   modal: { confirm: (opts: Record<string, unknown>) => void };
 * }} ctx
 */
export function buildBarcodesPanelColumns(ctx) {
  const {
    t,
    readOnly,
    inlineEdit,
    itemUomOptions,
    getInlineValues,
    patchDraft,
    patchPrimary,
    saveMutationPending,
    saveInline,
    cancelInline,
    startEditRow,
    deleteMutation,
    modal,
  } = ctx;

  return [
    {
      title: t("barcodeColIndex"),
      key: "index",
      width: 35,
      align: "center",
      render: (_v, r, i) => (r.id === BARCODE_DRAFT_ROW_ID ? "—" : i + 1),
    },
    {
      title: t("barcodeColCode"),
      key: "barcode",
      width: 200,
      align: "center",
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
      title: t("barcodeColUom"),
      key: "uom",
      width: 160,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return (
            <Select
              size="small"
              allowClear
              className="w-full min-w-0"
              placeholder={t("barcodeFieldUom")}
              value={draft.item_uom_id}
              options={itemUomOptions}
              onChange={(item_uom_id) => patchDraft({ item_uom_id: item_uom_id ?? undefined })}
              getPopupContainer={drawerSelectGetPopup}
              popupMatchSelectWidth={false}
              listHeight={280}
            />
          );
        }
        return r.item_uom?.uom?.name ?? r.item_uom?.uom?.code ?? "—";
      },
    },
    {
      title: t("barcodeColPrimary"),
      key: "primary",
      width: 80,
      align: "center",
      render: (_v, r) => {
        const draft = getInlineValues(r);
        if (draft) {
          return <Radio checked={draft.is_primary} onChange={() => patchDraft({ is_primary: true })} />;
        }
        return (
          <Radio
            checked={Boolean(r.is_primary)}
            disabled={readOnly || Boolean(inlineEdit)}
            onChange={() => patchPrimary(Number(r.id))}
          />
        );
      },
    },
    {
      title: t("barcodeColActions"),
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
        if (r.id === BARCODE_DRAFT_ROW_ID) return null;
        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              aria-label={t("barcodeModalEdit")}
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
