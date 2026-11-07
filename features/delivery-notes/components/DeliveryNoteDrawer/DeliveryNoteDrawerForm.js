"use client";

import { fetchCustomerNames } from "@/features/customers/api/customers.api";
import { fetchStockLots } from "@/features/stock/api/stock.api";
import { fetchWarehouseNames } from "@/features/warehouses/api/warehouses.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { fetchDeliverableOrders, fetchDeliveryTemplate } from "../../api/deliveryNotes.api";
import { recordToFormValues } from "../../utils/deliveryNoteDrawerUtils";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import {
  ItemUomSelect,
  SALE_ITEM_OPTIONS_QUERY_KEY,
  defaultSaleUom,
  fetchSaleItemOptionsPage,
} from "@/shared/components/selects/ItemPickers";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import { useQuery } from "@tanstack/react-query";
import { App, Col, DatePicker, Form, Input, Row, Select, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const emptyLine = () => ({ item_id: null, item_uom_id: null, quantity: null, lot_id: null });

/**
 * Lot picker for lot-tracked items (lots with stock in the warehouse).
 *
 * @param {{ itemId: unknown; warehouseId: unknown; value?: unknown; onChange?: (v: unknown) => void; disabled?: boolean; placeholder?: string }} props
 */
function LotSelect({ itemId, warehouseId, value, onChange, disabled, placeholder }) {
  const enabled = Boolean(itemId);
  const query = useQuery({
    queryKey: ["tenant", "stock", "lots", String(itemId ?? ""), String(warehouseId ?? "")],
    queryFn: () => fetchStockLots(/** @type {string} */ (itemId), /** @type {any} */ (warehouseId)),
    enabled,
    staleTime: QUERY_STALE_TIME.default,
  });
  const options = useMemo(
    () =>
      (query.data ?? []).map((lot) => ({
        value: Number(lot.id),
        label: [lot.lot_number, lot.expiry_date].filter(Boolean).join(" · "),
      })),
    [query.data],
  );
  return (
    <Select
      allowClear
      value={value ?? undefined}
      onChange={onChange}
      disabled={disabled || !enabled}
      loading={query.isFetching}
      options={options}
      placeholder={placeholder}
      getPopupContainer={drawerSelectGetPopup}
      className="w-full"
    />
  );
}

/**
 * Line grid with the same look as the sales order lines. Bound to the form's "lines" field.
 *
 * @param {{
 *   value?: Record<string, any>[];
 *   onChange?: (lines: Record<string, any>[]) => void;
 *   readOnly: boolean;
 *   warehouseId: unknown;
 *   t: (key: string) => string;
 * }} props
 */
function DeliveryNoteLineEditor({ value, onChange, readOnly, warehouseId, t }) {
  const lines = useMemo(() => (Array.isArray(value) && value.length > 0 ? value : [emptyLine()]), [value]);
  // Latest lines for async updates (default unit lookup finishes after the item pick).
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const setLines = useCallback(
    (next) => {
      linesRef.current = next;
      onChange?.(next);
    },
    [onChange],
  );
  const patch = useCallback(
    (index, partial) => setLines(linesRef.current.map((line, i) => (i === index ? { ...line, ...partial } : line))),
    [setLines],
  );

  const onItemChange = useCallback(
    (index, itemId, option) => {
      patch(index, {
        item_id: itemId ?? null,
        item_label: option?.label ?? null,
        item_uom_id: null,
        lot_id: null,
        track_lots: option?.track_lots === true,
      });
      if (!itemId) return;
      defaultSaleUom(String(itemId))
        .then((uom) => {
          if (!uom) return;
          if (String(linesRef.current[index]?.item_id ?? "") !== String(itemId)) return;
          patch(index, { item_uom_id: uom.item_uom_id });
        })
        .catch(() => {});
    },
    [patch],
  );

  // Lot is only needed for lot-tracked items; hide the column when no line has one.
  const showLot = lines.some((line) => line?.track_lots === true || line?.lot_id != null);
  const columns = useMemo(
    () => [
      { key: "line_no", label: "#", width: "56px" },
      { key: "item", label: t("colItem"), width: "minmax(220px, 2fr)" },
      { key: "uom", label: t("colUnit"), width: "160px" },
      { key: "quantity", label: t("colQuantity"), width: "140px" },
      ...(showLot ? [{ key: "lot", label: t("colLot"), width: "minmax(160px, 1fr)" }] : []),
    ],
    [showLot, t],
  );

  return (
    <section className="item-lines-panel">
      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly}
        onAddLine={() => setLines([...linesRef.current, emptyLine()])}
        addLabel={t("addLine")}
        deleteAriaLabel={t("actionDelete")}
        canRemoveLine={lines.length > 1}
        onRemoveLine={(index) => setLines(linesRef.current.filter((_, i) => i !== index))}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {Record<string, any>} */ (line);
          // Lines that come from the sales order keep their item and unit.
          const linked = row.sales_order_line_id != null;
          if (columnKey === "line_no") {
            return <span className="item-lines-readonly-uom item-lines-line-no">{index + 1}</span>;
          }
          if (columnKey === "item") {
            if (readOnly || linked) {
              return <span className="item-lines-readonly-uom">{row.item_label || "—"}</span>;
            }
            return (
              <ServerSearchSelect
                className="w-full"
                value={row.item_id ?? undefined}
                onChange={(next, option) => onItemChange(index, next, option)}
                fetchPage={fetchSaleItemOptionsPage}
                queryKey={SALE_ITEM_OPTIONS_QUERY_KEY}
                recentKind="delivery-note-item"
                seedOptions={row.item_id ? [{ value: String(row.item_id), label: String(row.item_label ?? row.item_id) }] : []}
                placeholder={t("colItem")}
                recentLabel={t("selectorRecent")}
                clearRecentLabel={t("selectorClearRecent")}
                resultsLabel={t("selectorResults")}
                loadMoreLabel={t("selectorLoadMore")}
                emptyLabel={t("selectorEmpty")}
                typeToSearchLabel={t("selectorTypeToSearch")}
                getPopupContainer={drawerSelectGetPopup}
              />
            );
          }
          if (columnKey === "uom") {
            return (
              <ItemUomSelect
                itemId={row.item_id}
                value={row.item_uom_id ?? undefined}
                onChange={(next) => patch(index, { item_uom_id: next ?? null })}
                disabled={readOnly || linked}
                placeholder={t("colUnit")}
              />
            );
          }
          if (columnKey === "quantity") {
            return (
              <TenantNumberInput
                kind="quantity"
                className="w-full"
                min={0}
                disabled={readOnly}
                value={row.quantity}
                onChange={(next) => patch(index, { quantity: next ?? null })}
              />
            );
          }
          if (row.track_lots !== true && row.lot_id == null) {
            return <span className="item-lines-readonly-uom">{"—"}</span>;
          }
          return (
            <LotSelect
              itemId={row.item_id}
              warehouseId={warehouseId}
              value={row.lot_id}
              onChange={(next) => patch(index, { lot_id: next ?? null })}
              disabled={readOnly}
              placeholder={t("colLot")}
            />
          );
        }}
      />
    </section>
  );
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function DeliveryNoteDrawerForm({ form, readOnly, t }) {
  const customersQuery = useQuery({
    queryKey: ["tenant", "customers", "names"],
    queryFn: () => fetchCustomerNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses", "names"],
    queryFn: () => fetchWarehouseNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const customerOptions = useMemo(
    () =>
      (Array.isArray(customersQuery.data) ? customersQuery.data : []).map((c) => ({
        value: String(c.id),
        label: [c.customer_code, c.name].filter(Boolean).join(" — "),
      })),
    [customersQuery.data],
  );
  const warehouseOptions = useMemo(
    () => (Array.isArray(warehousesQuery.data) ? warehousesQuery.data : []).map((w) => ({ value: Number(w.id), label: w.name })),
    [warehousesQuery.data],
  );

  const warehouseWatch = Form.useWatch("warehouse_id", form);
  const customerWatch = Form.useWatch("customer_id", form);
  const orderWatch = Form.useWatch("sales_order_id", form);
  const orderLabelWatch = Form.useWatch("sales_order_label", form);
  const fromOrder = Boolean(orderWatch);
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const [loadingOrder, setLoadingOrder] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["tenant", "delivery-notes", "deliverable-orders", String(customerWatch ?? "")],
    queryFn: () => fetchDeliverableOrders(String(customerWatch)),
    enabled: Boolean(customerWatch) && !readOnly,
    staleTime: QUERY_STALE_TIME.default,
  });
  const orderOptions = useMemo(() => {
    const rows = (ordersQuery.data ?? []).map((o) => ({
      value: String(o.id),
      label: [o.order_number, o.order_date].filter(Boolean).join(" · "),
    }));
    if (orderWatch && !rows.some((o) => o.value === String(orderWatch))) {
      rows.unshift({
        value: String(orderWatch),
        label: String(orderLabelWatch ?? orderWatch),
      });
    }
    return rows;
  }, [ordersQuery.data, orderWatch, orderLabelWatch]);

  /** Picking an order replaces the lines with everything it has not shipped yet. */
  const onOrderChange = useCallback(
    (orderId) => {
      if (!orderId) {
        form.setFieldsValue({
          sales_order_id: null,
          sales_order_label: null,
          lines: [emptyLine()],
        });
        return;
      }
      setLoadingOrder(true);
      fetchDeliveryTemplate(String(orderId))
        .then((template) => {
          const values = recordToFormValues(template);
          form.setFieldsValue({
            sales_order_id: values.sales_order_id,
            sales_order_label: values.sales_order_label,
            warehouse_id: form.getFieldValue("warehouse_id") ?? values.warehouse_id,
            notes: form.getFieldValue("notes") || values.notes,
            lines: values.lines,
          });
        })
        .catch((error) =>
          notification.error({
            title: t("orderLoadError"),
            description: getLocalizedApiErrorMessage(tApiErrors, error),
          }),
        )
        .finally(() => setLoadingOrder(false));
    },
    [form, notification, t, tApiErrors],
  );

  const onCustomerChange = useCallback(() => {
    if (form.getFieldValue("sales_order_id")) onOrderChange(null);
  }, [form, onOrderChange]);

  return (
    <div className="sales-invoice-keyboard-root">
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={readOnly}
        className="item-general-form sales-invoice-form"
      >
        <div className="sales-invoice-header">
          <div className="sales-invoice-header-pane">
            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="customer_id"
                  label={<ResourceDrawerFieldLabel text={t("fieldCustomer")} required />}
                  rules={[{ required: true, message: t("fieldCustomerRequired") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    loading={customersQuery.isPending}
                    options={customerOptions}
                    onChange={onCustomerChange}
                    getPopupContainer={drawerSelectGetPopup}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="delivery_date"
                  label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
                  rules={[{ required: true, message: t("fieldDateRequired") }]}
                >
                  <DatePicker className="w-full" format={dayjsDatePattern()} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[12, 8]} className="mt-2">
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<ResourceDrawerFieldLabel text={t("colOrder")} optional />}
                  extra={
                    customerWatch && !readOnly && !ordersQuery.isPending && orderOptions.length === 0
                      ? t("noDeliverableOrders")
                      : undefined
                  }
                >
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={customerWatch ? t("orderPlaceholder") : t("orderPickCustomerFirst")}
                    disabled={readOnly || !customerWatch}
                    loading={ordersQuery.isFetching || loadingOrder}
                    value={orderWatch ? String(orderWatch) : undefined}
                    onChange={(v) => onOrderChange(v ?? null)}
                    options={orderOptions}
                    getPopupContainer={drawerSelectGetPopup}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="warehouse_id"
                  label={<ResourceDrawerFieldLabel text={t("fieldWarehouse")} required />}
                  rules={[{ required: true, message: t("fieldWarehouseRequired") }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    loading={warehousesQuery.isPending}
                    options={warehouseOptions}
                    getPopupContainer={drawerSelectGetPopup}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="sales-invoice-header-pane">
            <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} />}>
              <Input.TextArea rows={4} maxLength={2000} style={{ resize: "none" }} />
            </Form.Item>
          </div>
        </div>
        <Form.Item name="sales_order_id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="sales_order_label" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="lines" noStyle>
          <DeliveryNoteLineEditor readOnly={readOnly} warehouseId={warehouseWatch} t={t} />
        </Form.Item>
        {fromOrder && !readOnly ? (
          <Typography.Text type="secondary" className="mt-2 text-xs">
            {t("fromOrderHint")}
          </Typography.Text>
        ) : null}
      </Form>
    </div>
  );
}
