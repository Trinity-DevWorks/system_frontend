"use client";

import { formatStockQuantity } from "../../utils/formatStockQuantity";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { Button, Input, Modal, Table } from "antd";
import { useMemo, useState } from "react";

/**
 * @param {unknown} value
 */
function toQty(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Per-line receive qty wizard. Empty body (receive all open) is a footer shortcut.
 *
 * @param {{
 *   open: boolean;
 *   lines: Array<Record<string, unknown>>;
 *   submitting?: boolean;
 *   t: (key: string) => string;
 *   onCancel: () => void;
 *   onSubmit: (body: { lines: Array<{ stock_transfer_line_id: number; quantity: number; notes?: string }> }) => void;
 * }} props
 */
export default function StockTransferReceiveModal({
  open,
  lines,
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
    <StockTransferReceiveModalBody
      key={draftKey}
      open={open}
      openLines={openLines}
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
 *   submitting?: boolean;
 *   t: (key: string) => string;
 *   onCancel: () => void;
 *   onSubmit: (body: { lines: Array<{ stock_transfer_line_id: number; quantity: number; notes?: string }> }) => void;
 * }} props
 */
function StockTransferReceiveModalBody({
  open,
  openLines,
  submitting = false,
  t,
  onCancel,
  onSubmit,
}) {
  const [qtyById, setQtyById] = useState(() => {
    /** @type {Record<string, number | null>} */
    const next = {};
    if (!open) return next;
    for (const line of openLines) {
      next[String(line.id)] = toQty(line.open_quantity);
    }
    return next;
  });
  const [notesById, setNotesById] = useState(() => {
    /** @type {Record<string, string>} */
    const notes = {};
    if (!open) return notes;
    for (const line of openLines) {
      notes[String(line.id)] = "";
    }
    return notes;
  });

  const fillAllOpen = () => {
    /** @type {Record<string, number | null>} */
    const next = {};
    for (const line of openLines) {
      next[String(line.id)] = toQty(line.open_quantity);
    }
    setQtyById(next);
  };

  const payloadLines = openLines
    .map((line) => {
      const id = Number(line.id);
      const qty = toQty(qtyById[String(line.id)]);
      if (!id || qty <= 0) return null;
      const notes = (notesById[String(line.id)] ?? "").trim();
      /** @type {{ stock_transfer_line_id: number; quantity: number; notes?: string }} */
      const row = { stock_transfer_line_id: id, quantity: qty };
      if (notes) row.notes = notes;
      return row;
    })
    .filter(Boolean);

  const columns = [
    {
      title: t("transferLineItem"),
      dataIndex: "item_name",
      key: "item",
      ellipsis: true,
      render: (_v, record) =>
        typeof record.item?.name === "string" ? record.item.name : t("transferLineItem"),
    },
    {
      title: t("transferLineLot"),
      key: "lot",
      width: 120,
      render: (_v, record) => record.lot?.lot_number || "\u2014",
    },
    {
      title: t("transferLineQuantity"),
      key: "ordered",
      width: 88,
      align: "right",
      render: (_v, record) => formatStockQuantity(record.quantity),
    },
    {
      title: t("transferLineReceived"),
      key: "received",
      width: 88,
      align: "right",
      render: (_v, record) => formatStockQuantity(record.received_quantity),
    },
    {
      title: t("transferLineOpen"),
      key: "open",
      width: 88,
      align: "right",
      render: (_v, record) => formatStockQuantity(record.open_quantity),
    },
    {
      title: t("transferReceiveNow"),
      key: "now",
      width: 120,
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
      title: t("transferFieldNotes"),
      key: "notes",
      width: 160,
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
      title={t("transferReceiveModalTitle")}
      open={open}
      onCancel={onCancel}
      width={960}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel} disabled={submitting}>
            {t("drawerCancel")}
          </Button>
          <Button onClick={fillAllOpen} disabled={submitting}>
            {t("transferReceiveAllOpen")}
          </Button>
          <Button
            type="primary"
            loading={submitting}
            disabled={payloadLines.length === 0}
            onClick={() => onSubmit({ lines: payloadLines })}
          >
            {t("actionPostTransferReceipt")}
          </Button>
        </div>
      }
    >
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={openLines}
        columns={columns}
        scroll={{ x: 840 }}
      />
    </Modal>
  );
}
