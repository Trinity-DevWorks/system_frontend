"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { createItemBarcode, deleteItemBarcode, updateItemBarcode } from "../../../../api/itemBarcodes.api";
import {
  isItemBarcodeRow,
  itemBarcodesQueryKey,
  removeItemBarcodeFromCache,
  setItemBarcodeInCache,
} from "../../../../queries/itemBarcodesQueryCache";
import { DeleteOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Input } from "antd";
import { useCallback, useState } from "react";

const starClass = "text-base text-[var(--ant-color-text-quaternary)]";
const starActiveClass = "text-base text-[var(--ant-color-warning)]";

const pillActionsClass =
  "inline-flex max-w-0 items-center gap-1.5 overflow-hidden opacity-0 transition-all duration-150 group-hover:ms-1.5 group-hover:max-w-[120px] group-hover:opacity-100 group-focus-within:ms-1.5 group-focus-within:max-w-[120px] group-focus-within:opacity-100 [@media(hover:none)]:ms-1.5 [@media(hover:none)]:max-w-[120px] [@media(hover:none)]:opacity-100";

function BarcodePillDivider() {
  return (
    <span className="select-none text-xs text-[var(--ant-color-text-quaternary)]" aria-hidden="true">
      |
    </span>
  );
}

/**
 * @param {{
 *   itemId: number;
 *   itemUomId: number;
 *   barcodes: unknown[];
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function ItemVariantBarcodesSection({ itemId, itemUomId, barcodes, readOnly, t, tApiErrors }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const rows = (barcodes ?? []).filter(
    (row) => row && typeof row === "object" && Number(/** @type {{ item_uom_id?: number }} */ (row).item_uom_id) === itemUomId,
  );

  const invalidateOnFallback = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: itemBarcodesQueryKey(itemId) });
  }, [queryClient, itemId]);

  const createMutation = useMutation({
    mutationFn: (code) =>
      createItemBarcode(itemId, {
        barcode: code,
        item_uom_id: itemUomId,
        is_primary: rows.length === 0,
      }),
    onSuccess: (saved) => {
      if (isItemBarcodeRow(saved)) {
        setItemBarcodeInCache(queryClient, itemId, saved);
      } else {
        invalidateOnFallback();
      }
      message.success(t("panelSaveSuccess"));
      setDraft("");
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (barcodeId) => updateItemBarcode(itemId, barcodeId, { is_primary: true }),
    onSuccess: (saved) => {
      if (isItemBarcodeRow(saved)) {
        setItemBarcodeInCache(queryClient, itemId, saved);
      } else {
        invalidateOnFallback();
      }
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (barcodeId) => deleteItemBarcode(itemId, barcodeId),
    onSuccess: (_data, deletedId) => {
      removeItemBarcodeFromCache(queryClient, itemId, deletedId);
      message.success(t("panelDeleteSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const addBarcode = () => {
    const code = draft.trim();
    if (!code) {
      message.error(t("barcodeFieldRequired"));
      return;
    }
    createMutation.mutate(code);
  };

  const pending =
    createMutation.isPending || setPrimaryMutation.isPending || deleteMutation.isPending;

  return (
    <section className="px-5 pb-[18px] pt-4">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ant-color-text-tertiary)]">
        {t("variantBarcodesTitle")}
      </h4>

      {rows.length === 0 ? (
        <p className="mb-3 text-[13px] text-[var(--ant-color-text-secondary)]">{t("variantBarcodesEmpty")}</p>
      ) : (
        <ul className="mb-3.5 flex list-none flex-wrap gap-2 p-0">
          {rows.map((row) => {
            const r = /** @type {{ id: number; barcode?: string; is_primary?: boolean }} */ (row);
            return (
              <li key={r.id} className="inline-flex max-w-full">
                <div className="group inline-flex max-w-full items-center rounded-lg bg-[var(--ant-color-fill-quaternary)] px-3 py-2">
                  <code className="truncate border-0 bg-transparent p-0 font-mono text-sm text-[var(--ant-color-text)]">
                    {r.barcode ?? "—"}
                  </code>
                  <span className={pillActionsClass}>
                    <BarcodePillDivider />
                    {!readOnly ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 leading-none disabled:cursor-default"
                          aria-label={t("barcodeFieldPrimary")}
                          disabled={pending || r.is_primary}
                          onClick={() => setPrimaryMutation.mutate(r.id)}
                        >
                          {r.is_primary ? (
                            <StarFilled className={starActiveClass} />
                          ) : (
                            <StarOutlined className={starClass} />
                          )}
                        </button>
                        <Button
                          type="text"
                          size="small"
                          danger
                          className="!-me-1 !h-6 !w-6 !min-w-0 !shrink-0 !p-0"
                          icon={<DeleteOutlined />}
                          aria-label={t("variantBarcodeDeleteConfirm")}
                          disabled={pending}
                          onClick={() =>
                            modal.confirm({
                              title: t("variantBarcodeDeleteConfirm"),
                              okType: "danger",
                              onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(r.id)),
                            })
                          }
                        />
                      </>
                    ) : r.is_primary ? (
                      <StarFilled className={starActiveClass} />
                    ) : (
                      <StarOutlined className={starClass} />
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly ? (
        <div className="flex items-stretch gap-2.5 max-[420px]:flex-col">
          <Input
            className="min-w-0 flex-1"
            value={draft}
            placeholder={t("variantBarcodesPlaceholder")}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onPressEnter={addBarcode}
          />
          <Button
            className="min-w-[72px] shrink-0 font-medium !border-[var(--ant-color-primary-border)] !bg-[var(--ant-color-bg-container)] !text-[var(--ant-color-primary)] hover:!border-[var(--ant-color-primary-hover)] hover:!bg-[var(--ant-color-primary-bg)] hover:!text-[var(--ant-color-primary-hover)] max-[420px]:w-full"
            disabled={pending}
            onClick={addBarcode}
          >
            {t("variantBarcodesAdd")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
