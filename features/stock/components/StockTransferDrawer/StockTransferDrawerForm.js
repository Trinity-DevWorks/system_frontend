"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { getStockTransferStatusLabel } from "../../utils/stockTransferStatuses";
import { formatTenantDateTime } from "@/lib/tenant-format";
import WarehouseFromToFields from "../WarehouseFromToFields";
import { Col, Form, Input, Row, Tag } from "antd";

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

      <WarehouseFromToFields
        form={form}
        disabled={readOnly}
        warehouseOptions={warehouseOptions}
        warehousesPending={warehousesPending}
        fromLabel={t("transferFieldFromWarehouse")}
        toLabel={t("transferFieldToWarehouse")}
        fromPlaceholder={t("transferFromPlaceholder")}
        toPlaceholder={t("transferToPlaceholder")}
        fromRequiredMessage={t("transferFromRequired")}
        toRequiredMessage={t("transferToRequired")}
        sameWarehouseMessage={t("transferSameWarehouse")}
        swapLabel={t("transferSwapWarehouses")}
      />

      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("transferFieldNotes")} />}>
        <Input.TextArea rows={2} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
