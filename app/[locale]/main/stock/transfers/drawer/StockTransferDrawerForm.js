"use client";

import ResourceDrawerFieldLabel from "@/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/components/resource-drawer/drawerFormUtils";
import { getStockTransferStatusLabel } from "../../shared/stockTransferStatuses";
import { formatTenantDateTime } from "@/lib/tenant-format";
import { Col, Form, Input, Row, Select, Tag } from "antd";
import { useMemo } from "react";
import { transferWarehousesAreDistinct } from "./stockTransferDrawerUtils";

/**
 * @param {import("antd").FormInstance} form
 * @param {(key: string) => string} t
 */
function warehouseDistinctValidator(form, t) {
  return {
    validator() {
      const fromId = form.getFieldValue("from_warehouse_id");
      const toId = form.getFieldValue("to_warehouse_id");
      if (!transferWarehousesAreDistinct(fromId, toId)) {
        return Promise.reject(new Error(t("transferSameWarehouse")));
      }
      return Promise.resolve();
    },
  };
}

/**
 * @param {string | null | undefined} status
 */
function transferStatusColor(status) {
  if (status === "received") return "success";
  if (status === "in_transit") return "warning";
  if (status === "cancelled") return "default";
  return "processing";
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: number; label: string }[];
 *   warehousesPending: boolean;
 *   transferNumber?: string | null;
 *   transferStatus?: string | null;
 *   dispatchedAt?: string | null;
 *   receivedAt?: string | null;
 *   showMeta?: boolean;
 * }} props
 */
export default function StockTransferDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  warehousesPending,
  transferNumber = null,
  transferStatus = null,
  dispatchedAt = null,
  receivedAt = null,
  showMeta = false,
}) {
  const fromId = Form.useWatch("from_warehouse_id", form);
  const toId = Form.useWatch("to_warehouse_id", form);

  const fromWarehouseOptions = useMemo(
    () => warehouseOptions.filter((option) => option.value !== toId),
    [warehouseOptions, toId],
  );

  const toWarehouseOptions = useMemo(
    () => warehouseOptions.filter((option) => option.value !== fromId),
    [warehouseOptions, fromId],
  );

  const distinctRule = useMemo(() => warehouseDistinctValidator(form, t), [form, t]);

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      className="item-general-form"
      disabled={readOnly}
    >
      {showMeta ? (
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("transferFieldNumber")} />}>
              <Input value={transferNumber ?? "\u2014"} readOnly disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("transferFieldStatus")} />}>
              {transferStatus ? (
                <Tag color={transferStatusColor(transferStatus)}>
                  {getStockTransferStatusLabel(t, transferStatus)}
                </Tag>
              ) : (
                "\u2014"
              )}
            </Form.Item>
          </Col>
        </Row>
      ) : null}

      {showMeta && (transferStatus === "in_transit" || transferStatus === "received") ? (
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("transferFieldDispatchedAt")} />}>
              <Input
                value={formatTenantDateTime(dispatchedAt) || t("transferNotDispatchedYet")}
                readOnly
                disabled
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label={<ResourceDrawerFieldLabel text={t("transferFieldReceivedAt")} />}>
              <Input
                value={formatTenantDateTime(receivedAt) || t("transferNotReceivedYet")}
                readOnly
                disabled
              />
            </Form.Item>
          </Col>
        </Row>
      ) : null}

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="from_warehouse_id"
            label={<ResourceDrawerFieldLabel text={t("transferFieldFromWarehouse")} required />}
            dependencies={["to_warehouse_id"]}
            rules={[{ required: true, message: t("transferFromRequired") }, distinctRule]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("transferFromPlaceholder")}
              options={fromWarehouseOptions}
              loading={warehousesPending}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="to_warehouse_id"
            label={<ResourceDrawerFieldLabel text={t("transferFieldToWarehouse")} required />}
            dependencies={["from_warehouse_id"]}
            rules={[{ required: true, message: t("transferToRequired") }, distinctRule]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("transferToPlaceholder")}
              options={toWarehouseOptions}
              loading={warehousesPending}
              getPopupContainer={drawerSelectGetPopup}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("transferFieldNotes")} />}>
        <Input.TextArea rows={2} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
