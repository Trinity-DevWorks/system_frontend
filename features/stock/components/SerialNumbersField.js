"use client";

import { BarcodeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Collapse, Input, InputNumber, Modal, Select, Space, Tag, Tooltip, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { fetchAvailableSerials } from "../api/serials.api";

/** Same rule as the backend (InventorySerialService::normalize). */
const normalize = (value) => String(value ?? "").trim().toUpperCase();

/**
 * @param {string} text
 * @returns {string[]}
 */
const splitList = (text) =>
  String(text ?? "")
    .split(/[\r\n,;\t]+/)
    .map(normalize)
    .filter(Boolean);

/**
 * Serial numbers of one document line.
 *
 * The line cell shows "entered / needed" (red until they match); clicking it opens a dialog:
 * - `in`:   scan / type / paste numbers, or generate a range (receipts, opening stock);
 * - `out`:  pick from the units in stock in the line's warehouse (invoices, delivery notes);
 * - `pick`: choose from a fixed list, e.g. the serials sold on the invoice line (returns).
 *
 * @param {{
 *   mode: "in" | "out" | "pick";
 *   value?: string[] | null;
 *   quantity: number;
 *   itemId?: string | null;
 *   itemName?: string | null;
 *   warehouseId?: number | string | null;
 *   choices?: string[];
 *   readOnly?: boolean;
 *   pickHint?: string;
 *   onChange?: (serials: string[]) => void;
 * }} props
 */
export default function SerialNumbersField({
  mode,
  value,
  quantity,
  itemId,
  itemName,
  warehouseId,
  choices = [],
  readOnly = false,
  pickHint,
  onChange,
}) {
  const t = useTranslations("SerialNumbers");
  const [open, setOpen] = useState(false);
  const serials = Array.isArray(value) ? value : [];
  const needed = Number.isFinite(quantity) ? Math.max(0, Math.round(quantity)) : 0;
  const complete = serials.length === needed;

  return (
    <>
      <Tooltip title={readOnly ? serials.join(", ") || t("empty") : complete ? t("cellComplete") : t("cellIncomplete")}>
        <Button
          size="small"
          icon={<BarcodeOutlined />}
          danger={!readOnly && !complete}
          onClick={() => setOpen(true)}
          className="max-w-full"
        >
          {t("cellCount", { count: serials.length, quantity: needed })}
        </Button>
      </Tooltip>
      {open ? (
        <SerialNumbersDialog
          mode={mode}
          initial={serials}
          needed={needed}
          itemId={itemId}
          itemName={itemName}
          warehouseId={warehouseId}
          choices={choices}
          readOnly={readOnly}
          pickHint={pickHint}
          onClose={() => setOpen(false)}
          onSave={(next) => {
            onChange?.(next);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * @param {{
 *   mode: "in" | "out" | "pick";
 *   initial: string[];
 *   needed: number;
 *   itemId?: string | null;
 *   itemName?: string | null;
 *   warehouseId?: number | string | null;
 *   choices: string[];
 *   readOnly: boolean;
 *   pickHint?: string;
 *   onClose: () => void;
 *   onSave: (serials: string[]) => void;
 * }} props
 */
function SerialNumbersDialog({ mode, initial, needed, itemId, itemName, warehouseId, choices, readOnly, pickHint, onClose, onSave }) {
  const t = useTranslations("SerialNumbers");
  const [list, setList] = useState(initial);
  const [scan, setScan] = useState("");
  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [range, setRange] = useState({ prefix: "", start: "1", count: needed > 0 ? needed : 1 });

  const available = useQuery({
    queryKey: ["tenant", "stock-serials-available", itemId, warehouseId],
    queryFn: () => fetchAvailableSerials({ itemId: String(itemId), warehouseId: String(warehouseId) }),
    enabled: mode === "out" && !readOnly && Boolean(itemId) && warehouseId != null && warehouseId !== "",
    staleTime: 0,
  });

  const pickOptions = useMemo(() => {
    const source = mode === "pick" ? choices : (available.data ?? []).map((row) => row.serial_number);
    // Keep already-chosen numbers visible even when they are no longer "available" (saved draft).
    const all = Array.from(new Set([...list, ...source]));
    return all.map((serial) => ({ value: serial, label: serial }));
  }, [mode, choices, available.data, list]);

  /** @param {string[]} incoming */
  const addMany = (incoming) => {
    const next = [...list];
    const duplicates = [];
    for (const serial of incoming) {
      if (next.includes(serial)) duplicates.push(serial);
      else next.push(serial);
    }
    setList(next);
    if (duplicates.length > 0) setMessage(t("duplicate", { serials: duplicates.join(", ") }));
    else if (next.length > needed) setMessage(t("tooMany", { quantity: needed }));
    else setMessage(null);
  };

  const addRange = () => {
    const count = Math.max(1, Math.min(5000, Math.round(Number(range.count) || 0)));
    const startText = String(range.start ?? "").trim() || "1";
    const startNumber = Number.parseInt(startText, 10);
    if (!Number.isFinite(startNumber)) return;
    const width = startText.length;
    const generated = Array.from({ length: count }, (_, i) =>
      normalize(`${range.prefix}${String(startNumber + i).padStart(width, "0")}`),
    );
    addMany(generated);
  };

  const remaining = needed - list.length;
  const title = t("dialogTitle", { item: itemName ?? "" });

  return (
    <Modal
      open
      centered
      width={560}
      title={title}
      onCancel={onClose}
      okText={t("done")}
      cancelText={t("cancel")}
      onOk={() => onSave(list)}
      footer={readOnly ? (_, { CancelBtn }) => <CancelBtn /> : undefined}
      styles={{ body: { maxHeight: "calc(100dvh - 220px)", overflowY: "auto" } }}
      destroyOnHidden
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Typography.Text type={list.length === needed ? "success" : "warning"}>
          {t("counter", { count: list.length, quantity: needed })}
        </Typography.Text>
        {!readOnly && list.length > 0 ? (
          <Button size="small" type="link" danger onClick={() => { setList([]); setMessage(null); }}>
            {t("clearAll")}
          </Button>
        ) : null}
      </div>

      {readOnly ? null : mode === "in" ? (
        <>
          <Input.TextArea
            autoFocus
            value={scan}
            autoSize={{ minRows: 1, maxRows: 4 }}
            placeholder={t("scanPlaceholder")}
            onChange={(e) => setScan(e.target.value)}
            onPressEnter={(e) => {
              if (e.shiftKey) return;
              e.preventDefault();
              const items = splitList(scan);
              if (items.length > 0) addMany(items);
              setScan("");
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[\r\n,;\t]/.test(text)) {
                e.preventDefault();
                addMany(splitList(text));
                setScan("");
              }
            }}
          />
          <Typography.Text type="secondary" className="mt-1 block text-xs">
            {t("scanHint")}
          </Typography.Text>
          <Collapse
            className="!mt-3"
            size="small"
            items={[
              {
                key: "range",
                label: t("addRange"),
                children: (
                  <Space wrap align="end">
                    <div>
                      <div className="mb-1 text-xs">{t("rangePrefix")}</div>
                      <Input
                        value={range.prefix}
                        onChange={(e) => setRange((r) => ({ ...r, prefix: e.target.value }))}
                        placeholder="SN-"
                        className="!w-28"
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-xs">{t("rangeStart")}</div>
                      <Input
                        value={range.start}
                        onChange={(e) => setRange((r) => ({ ...r, start: e.target.value.replace(/\D/g, "") }))}
                        placeholder="0001"
                        className="!w-24"
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-xs">{t("rangeCount")}</div>
                      <InputNumber
                        min={1}
                        max={5000}
                        value={range.count}
                        onChange={(v) => setRange((r) => ({ ...r, count: Number(v) || 1 }))}
                        className="!w-24"
                      />
                    </div>
                    <Button onClick={addRange}>{t("rangeAdd")}</Button>
                  </Space>
                ),
              },
            ]}
          />
        </>
      ) : (
        <>
          <Select
            autoFocus
            mode="multiple"
            className="w-full"
            value={list}
            options={pickOptions}
            loading={available.isFetching}
            placeholder={t("pickPlaceholder")}
            onChange={(next) => {
              setList(next);
              setMessage(next.length > needed ? t("tooMany", { quantity: needed }) : null);
            }}
            maxTagCount="responsive"
            notFoundContent={available.isFetching ? null : t("noneAvailable")}
            filterOption={(input, option) => String(option?.value ?? "").includes(normalize(input))}
          />
          <Typography.Text type="secondary" className="mt-1 block text-xs">
            {mode === "pick" ? (pickHint ?? t("pickReturnHint")) : t("pickHint")}
          </Typography.Text>
        </>
      )}

      {message ? <Alert className="!mt-3" type="warning" showIcon title={message} /> : null}
      {!readOnly && remaining > 0 && list.length > 0 ? (
        <Typography.Text type="secondary" className="mt-2 block text-xs">
          {t("remaining", { count: remaining })}
        </Typography.Text>
      ) : null}

      {mode === "in" || readOnly ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {list.length === 0 ? (
            <Typography.Text type="secondary">{t("empty")}</Typography.Text>
          ) : (
            list.map((serial) => (
              <Tag
                key={serial}
                closable={!readOnly}
                onClose={(e) => {
                  e.preventDefault();
                  setList((current) => current.filter((s) => s !== serial));
                  setMessage(null);
                }}
              >
                {serial}
              </Tag>
            ))
          )}
        </div>
      ) : null}
    </Modal>
  );
}
