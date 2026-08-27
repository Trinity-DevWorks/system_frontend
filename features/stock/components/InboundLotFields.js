"use client";

import { dayjsDatePattern } from "@/lib/tenant-format";
import { isPersistedEntityId } from "@/lib/entityId";
import { PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Input, Modal, Space } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import StockLotSelect from "./StockLotSelect";
import { useTransferLineLotOptions } from "../queries/useStockTransferDrawerData";

const NEW_LOT_VALUE = "__inbound_new_lot__";

/**
 * @param {unknown} value
 */
function expiryPickerValue(value) {
  if (value == null || value === "") return undefined;
  const parsed = dayjs.isDayjs(value) ? value : dayjs(value);
  return parsed.isValid() ? parsed : undefined;
}

/**
 * Existing-lot select with (+) to add a new lot number and optional expiry.
 *
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   lotId?: number;
 *   lotNumber?: string;
 *   expiryDate?: string;
 *   readOnly: boolean;
 *   allowNewLot?: boolean;
 *   lotPlaceholder: string;
 *   lotNumberPlaceholder: string;
 *   t: (key: string) => string;
 *   onPatch: (patch: { lot_id?: number; lot_number?: string; expiry_date?: string }) => void;
 * }} props
 */
export default function InboundLotFields({
  itemId,
  warehouseId,
  lotId,
  lotNumber,
  expiryDate,
  readOnly,
  allowNewLot = true,
  lotPlaceholder,
  lotNumberPlaceholder,
  t,
  onPatch,
}) {
  const { options, pending } = useTransferLineLotOptions({
    itemId,
    warehouseId,
    enabled: !readOnly && isPersistedEntityId(itemId) && warehouseId != null,
    t,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [draftNumber, setDraftNumber] = useState("");
  const [draftExpiry, setDraftExpiry] = useState("");

  const newLotLabel = String(lotNumber ?? "").trim();
  const hasNewLot = allowNewLot && lotId == null && newLotLabel !== "";

  const selectOptions = useMemo(() => {
    if (!hasNewLot) return options;
    return [{ value: NEW_LOT_VALUE, label: newLotLabel }, ...options];
  }, [hasNewLot, newLotLabel, options]);

  if (readOnly) {
    const expiry = typeof expiryDate === "string" ? expiryDate.trim() : "";
    const label = [newLotLabel || null, expiry || null].filter(Boolean).join(" · ");
    return <Input value={label || "\u2014"} disabled />;
  }

  const selectValue = lotId ?? (hasNewLot ? NEW_LOT_VALUE : undefined);
  const canAdd = allowNewLot && !readOnly && itemId != null;

  const openAddModal = () => {
    setDraftNumber(newLotLabel);
    setDraftExpiry(typeof expiryDate === "string" ? expiryDate : "");
    setAddOpen(true);
  };

  const applyNewLot = () => {
    const number = draftNumber.trim();
    if (!number) return;
    onPatch({
      lot_id: undefined,
      lot_number: number,
      expiry_date: draftExpiry || "",
    });
    setAddOpen(false);
  };

  return (
    <>
      <Space.Compact block className="w-full">
        <div className="min-w-0 flex-1">
          <StockLotSelect
            placeholder={lotPlaceholder}
            value={selectValue}
            options={selectOptions}
            loading={pending}
            disabled={readOnly || itemId == null}
            onChange={(value) => {
              if (value === NEW_LOT_VALUE) return;
              onPatch({ lot_id: value, lot_number: "", expiry_date: "" });
            }}
          />
        </div>
        {canAdd ? (
          <Button
            icon={<PlusOutlined />}
            aria-label={t("lotAddNew")}
            title={t("lotAddNew")}
            type={hasNewLot ? "primary" : "default"}
            ghost={hasNewLot}
            onClick={openAddModal}
          />
        ) : null}
      </Space.Compact>

      <Modal
        title={t("lotAddNew")}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={applyNewLot}
        okText={t("lotAddNewApply")}
        cancelText={t("drawerCancel")}
        okButtonProps={{ disabled: draftNumber.trim() === "" }}
        destroyOnHidden
        zIndex={1100}
      >
        <div className="flex flex-col gap-3 pt-1">
          <Input
            placeholder={lotNumberPlaceholder}
            value={draftNumber}
            maxLength={64}
            autoFocus
            onChange={(event) => setDraftNumber(event.target.value)}
            onPressEnter={applyNewLot}
          />
          <DatePicker
            className="w-full"
            placeholder={t("lotExpiryPlaceholder")}
            format={dayjsDatePattern()}
            value={expiryPickerValue(draftExpiry)}
            allowClear
            onChange={(date) => setDraftExpiry(date ? date.format("YYYY-MM-DD") : "")}
          />
        </div>
      </Modal>
    </>
  );
}
