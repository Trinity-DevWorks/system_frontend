"use client";

import { formatStockQuantity } from "../../utils/formatStockQuantity";
import { formatTenantDateTime } from "@/lib/tenant-format";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { Table, Tag, Typography } from "antd";

/**
 * @param {{
 *   receipts?: Array<Record<string, unknown>>;
 *   closures?: Array<Record<string, unknown>>;
 *   t: (key: string) => string;
 * }} props
 */
export default function StockTransferHistoryPanel({ receipts = [], closures = [], t }) {
  if ((!receipts || receipts.length === 0) && (!closures || closures.length === 0)) {
    return null;
  }

  return (
    <section className="item-lines-panel mt-4">
      {receipts.length > 0 ? (
        <>
          <ResourceDrawerPanelHeader title={t("transferReceiptsTitle")} />
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            className="mb-4"
            dataSource={receipts}
            expandable={{
              expandedRowRender: (receipt) => (
                <Table
                  size="small"
                  pagination={false}
                  rowKey="id"
                  dataSource={Array.isArray(receipt.lines) ? receipt.lines : []}
                  columns={[
                    {
                      title: t("transferLineItem"),
                      dataIndex: "item_name",
                      render: (value) => value || "\u2014",
                    },
                    {
                      title: t("transferLineLot"),
                      dataIndex: "lot_number",
                      width: 120,
                      render: (value) => value || "\u2014",
                    },
                    {
                      title: t("transferLineQuantity"),
                      dataIndex: "quantity",
                      width: 100,
                      align: "right",
                      render: (value) => formatStockQuantity(value),
                    },
                  ]}
                />
              ),
            }}
            columns={[
              {
                title: t("transferReceiptNumber"),
                dataIndex: "receipt_number",
                width: 140,
                render: (value) =>
                  value ? (
                    <Typography.Text code className="text-xs">
                      {value}
                    </Typography.Text>
                  ) : (
                    "\u2014"
                  ),
              },
              {
                title: t("transferFieldReceivedAt"),
                dataIndex: "posted_at",
                width: 180,
                render: (value) => formatTenantDateTime(value) || "\u2014",
              },
              {
                title: t("transferReceiptPostedBy"),
                key: "posted_by",
                render: (_v, record) => record.posted_by?.name || "\u2014",
              },
            ]}
          />
        </>
      ) : null}

      {closures.length > 0 ? (
        <>
          <ResourceDrawerPanelHeader title={t("transferClosuresTitle")} />
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={closures}
            expandable={{
              expandedRowRender: (closure) => (
                <Table
                  size="small"
                  pagination={false}
                  rowKey="id"
                  dataSource={Array.isArray(closure.lines) ? closure.lines : []}
                  columns={[
                    {
                      title: t("transferLineItem"),
                      dataIndex: "item_name",
                      render: (value) => value || "\u2014",
                    },
                    {
                      title: t("transferCloseOutcome"),
                      dataIndex: "outcome",
                      width: 120,
                      render: (value) => (
                        <Tag>
                          {value === "write_off"
                            ? t("transferCloseOutcomeWriteOff")
                            : t("transferCloseOutcomeReturn")}
                        </Tag>
                      ),
                    },
                    {
                      title: t("transferLineQuantity"),
                      dataIndex: "quantity",
                      width: 100,
                      align: "right",
                      render: (value) => formatStockQuantity(value),
                    },
                    {
                      title: t("transferCloseReason"),
                      dataIndex: "reason_name",
                      render: (value) => value || "\u2014",
                    },
                  ]}
                />
              ),
            }}
            columns={[
              {
                title: t("transferClosureNumber"),
                dataIndex: "closure_number",
                width: 140,
                render: (value) =>
                  value ? (
                    <Typography.Text code className="text-xs">
                      {value}
                    </Typography.Text>
                  ) : (
                    "\u2014"
                  ),
              },
              {
                title: t("transferClosedAt"),
                dataIndex: "closed_at",
                width: 180,
                render: (value) => formatTenantDateTime(value) || "\u2014",
              },
              {
                title: t("transferReceiptPostedBy"),
                key: "created_by",
                render: (_v, record) => record.created_by?.name || "\u2014",
              },
            ]}
          />
        </>
      ) : null}
    </section>
  );
}
