"use client";

import { dayjsDatePattern } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { Alert, Col, DatePicker, Form, Input, Row, Select, Space } from "antd";
import dayjs from "dayjs";
import InboundLotFields from "../InboundLotFields";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: unknown; label: string }[];
 *   warehousesPending: boolean;
 *   itemOptions: { value: string; label: string; track_lots?: boolean }[];
 *   itemsPending: boolean;
 *   prdNumber?: string | null;
 *   produceTrackLots: boolean;
 *   recipeUom?: string;
 *   recipePending: boolean;
 *   recipeMissing: boolean;
 *   recipeEmpty: boolean;
 *   yieldHint?: string | null;
 * }} props
 */
export default function ProductionDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
  itemOptions,
  itemsPending,
  prdNumber,
  produceTrackLots,
  recipeUom,
  recipePending,
  recipeMissing,
  recipeEmpty,
  yieldHint,
}) {
  const warehouseId = Form.useWatch("warehouse_id", form);
  const itemId = Form.useWatch("item_id", form);
  const lotId = Form.useWatch("lot_id", form);
  const lotNumber = Form.useWatch("lot_number", form);
  const expiryDate = Form.useWatch("expiry_date", form);

  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      {prdNumber ? (
        <Form.Item label={t("prdFieldNumber")}>
          <Input value={prdNumber} disabled />
        </Form.Item>
      ) : null}

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="warehouse_id"
            label={t("prdFieldWarehouse")}
            rules={[{ required: true, message: t("prdWarehouseRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouseOptions}
              loading={warehousesPending}
              placeholder={t("prdWarehousePlaceholder")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="production_date"
            label={t("prdFieldProductionDate")}
            getValueProps={(value) => ({
              value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined,
            })}
          >
            <DatePicker className="w-[calc(7rem+52px)]" format={dayjsDatePattern()} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="item_id"
            label={t("prdFieldItem")}
            rules={[{ required: true, message: t("prdItemRequired") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={itemOptions}
              loading={itemsPending}
              placeholder={t("prdItemPlaceholder")}
              onChange={() => {
                form.setFieldsValue({ lot_id: undefined, lot_number: "", expiry_date: undefined });
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label={t("prdFieldQuantity")} required>
            <Space.Compact>
              <Form.Item
                name="quantity"
                noStyle
                rules={[{ required: true, message: t("prdQuantityRequired") }]}
              >
                <TenantNumberInput kind="quantity" className="w-28" min={0.000001} />
              </Form.Item>
              {recipeUom ? (
                <Input
                  readOnly
                  value={recipeUom}
                  tabIndex={-1}
                  aria-hidden
                  className="!w-[3.25rem] shrink-0 px-1 text-center"
                  style={{ width: 52 }}
                  styles={{ input: { textAlign: "center", width: 52 } }}
                />
              ) : null}
            </Space.Compact>
          </Form.Item>
        </Col>
      </Row>

      {recipePending ? <Alert type="info" showIcon title={t("prdRecipeLoading")} className="mb-4" /> : null}
      {recipeMissing ? <Alert type="warning" showIcon title={t("prdNoRecipe")} className="mb-4" /> : null}
      {recipeEmpty ? <Alert type="warning" showIcon title={t("prdNoIngredients")} className="mb-4" /> : null}
      {yieldHint ? <p className="mb-4 text-sm text-[var(--ant-color-text-secondary)]">{yieldHint}</p> : null}

      {produceTrackLots ? (
        <>
          <Form.Item name="lot_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="lot_number" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="expiry_date" hidden>
            <Input />
          </Form.Item>
          <Form.Item label={t("prdFieldLot")}>
            <InboundLotFields
              itemId={itemId}
              warehouseId={warehouseId != null ? Number(warehouseId) : undefined}
              lotId={lotId}
              lotNumber={typeof lotNumber === "string" ? lotNumber : ""}
              expiryDate={typeof expiryDate === "string" ? expiryDate : ""}
              readOnly={readOnly}
              t={t}
              lotPlaceholder={t("prdLineLotPlaceholder")}
              lotNumberPlaceholder={t("prdLineLotNumberPlaceholder")}
              onPatch={(patch) => form.setFieldsValue(patch)}
            />
          </Form.Item>
        </>
      ) : null}

      <Form.Item name="notes" label={t("prdFieldNotes")}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>
    </Form>
  );
}
