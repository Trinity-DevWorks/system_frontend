"use client";

import { formatStockQuantity } from "../../utils/formatStockQuantity";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { Button, Input, Modal, Select, Table } from "antd";
import { useMemo, useState } from "react";

/**
 * @param {unknown} value
 */
function toQty(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {{
 *   open: boolean;
 *   lines: Array<Record<string, unknown>>;
 *   reasonOptions: { value: number; label: string }[];
 *   reasonsPending?: boolean;
 *   submitting?: boolean;
 *   t: (key: string) => string;
 *   onCancel: () => void;
 *   onSubmit: (body: {
 *     lines: Array<{
 *       stock_transfer_line_id: number;
 *       outcome: "return" | "write_off";
 *       quantity: number;
 *       stock_adjustment_reason_id: number;
 *     }>;
 *   }) => void;
 * }} props
 */
export default function StockTransferCloseOpenModal({
  open,
  lines,
  reasonOptions,
  reasonsPending = false,
  submitting = false,
  t,
  onCancel,
  onSubmit,
}) {
  const openLines = useMemo(
    () =>
      (lines ?? []).filter((line) => toQty(line.open_quantity ?? line.quantity) > 0 && line.id != null),
    [lines],
  );
  const draftKey = open
    ? openLines.map((line) => `${line.id}:${toQty(line.open_quantity)}`).join("|")
    : "";

  return (
    <StockTransferCloseOpenModalBody
      key={draftKey}
      open={open}
      openLines={openLines}
      reasonOptions={reasonOptions}
      reasonsPending={reasonsPending}
      submitting={submitting}
      t={t}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
}

/**
 * @param {{
 *   open: boolean;
 *   openLines: Array<Record<string, unknown>>;
 *   reasonOptions: { value: number; label: string }[];
 *   reasonsPending?: boolean;
 *   submitting?: boolean;
 *   t: (key: string) => string;
 *   onCancel: () => void;
 *   onSubmit: (body: {
 *     lines: Array<{
 *       stock_transfer_line_id: number;
 *       outcome: "return" | "write_off";
 *       quantity: number;
 *       stock_adjustment_reason_id: number;
 *     }>;
 *   }) => void;
 * }} props
 */
function StockTransferCloseOpenModalBody({
  open,
  openLines,
  reasonOptions,
  reasonsPending = false,
  submitting = false,
  t,
  onCancel,
  onSubmit,
}) {
  const [qtyById, setQtyById] = useState(() => {
    /** @type {Record<string, number | null>} */
    const qty = {};
    if (!open) return qty;
    for (const line of openLines) qty[String(line.id)] = toQty(line.open_quantity);
    return qty;
  });
  const [outcomeById, setOutcomeById] = useState(() => {
    /** @type {Record<string, "return" | "write_off">} */
    const outcome = {};
    if (!open) return outcome;
    for (const line of openLines) outcome[String(line.id)] = "return";
    return outcome;
  });
  const [reasonById, setReasonById] = useState(() => {
    /** @type {Record<string, number | undefined>} */
    const reason = {};
    if (!open) return reason;
    for (const line of openLines) reason[String(line.id)] = undefined;
    return reason;
  });
  const [notesById, setNotesById] = useState(() => {
    /** @type {Record<string, string>} */
    const notes = {};
    if (!open) return notes;
    for (const line of openLines) notes[String(line.id)] = "";
    return notes;
  });

  const payloadLines = openLines
    .map((line) => {
      const id = Number(line.id);
      const key = String(line.id);
      const qty = toQty(qtyById[key]);
      const reasonId = reasonById[key];
      const outcome = outcomeById[key] ?? "return";
      if (!id || qty <= 0 || reasonId == null) return null;
      return {
        stock_transfer_line_id: id,
        outcome,
        quantity: qty,
        stock_adjustment_reason_id: reasonId,
        ...(notesById[key]?.trim() ? { notes: notesById[key].trim() } : {}),
      };
    })
    .filter(Boolean);

  const outcomeOptions = [
    { value: "return", label: t("transferCloseOutcomeReturn") },
    { value: "write_off", label: t("transferCloseOutcomeWriteOff") },
  ];

  const columns = [
    {
      title: t("transferLineItem"),
      key: "item",
      ellipsis: true,
      render: (_v, record) =>
        typeof record.item?.name === "string" ? record.item.name : t("transferLineItem"),
    },
    {
      title: t("transferLineOpen"),
      key: "open",
      width: 88,
      align: "right",
      render: (_v, record) => formatStockQuantity(record.open_quantity),
    },
    {
      title: t("transferCloseQty"),
      key: "qty",
      width: 110,
      render: (_v, record) => (
        <TenantNumberInput
          kind="quantity"
          className="w-full"
          min={0}
          max={toQty(record.open_quantity)}
          value={qtyById[String(record.id)] ?? 0}
          onChange={(value) =>
            setQtyById((prev) => ({ ...prev, [String(record.id)]: value ?? 0 }))
          }
        />
      ),
    },
    {
      title: t("transferCloseOutcome"),
      key: "outcome",
      width: 140,
      render: (_v, record) => (
        <Select
          className="w-full"
          options={outcomeOptions}
          value={outcomeById[String(record.id)] ?? "return"}
          onChange={(value) =>
            setOutcomeById((prev) => ({ ...prev, [String(record.id)]: value }))
          }
        />
      ),
    },
    {
      title: t("transferCloseReason"),
      key: "reason",
      width: 180,
      render: (_v, record) => (
        <Select
          className="w-full"
          allowClear
          showSearch
          optionFilterProp="label"
          loading={reasonsPending}
          options={reasonOptions}
          value={reasonById[String(record.id)]}
          placeholder={t("transferCloseReasonPlaceholder")}
          onChange={(value) =>
            setReasonById((prev) => ({ ...prev, [String(record.id)]: value }))
          }
        />
      ),
    },
    {
      title: t("transferFieldNotes"),
      key: "notes",
      width: 140,
      render: (_v, record) => (
        <Input
          value={notesById[String(record.id)] ?? ""}
          maxLength={1000}
          onChange={(e) =>
            setNotesById((prev) => ({ ...prev, [String(record.id)]: e.target.value }))
          }
        />
      ),
    },
  ];

  return (
    <Modal
      title={t("transferCloseOpenModalTitle")}
      open={open}
      onCancel={onCancel}
      width={980}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel} disabled={submitting}>
            {t("drawerCancel")}
          </Button>
          <Button
            type="primary"
            loading={submitting}
            disabled={payloadLines.length === 0}
            onClick={() => onSubmit({ lines: payloadLines })}
          >
            {t("actionCloseTransferOpen")}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-neutral-500">{t("transferCloseOpenHint")}</p>
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={openLines}
        columns={columns}
        scroll={{ x: 860 }}
      />
    </Modal>
  );
}
