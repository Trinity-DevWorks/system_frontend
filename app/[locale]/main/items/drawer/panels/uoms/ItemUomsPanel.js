"use client";

/**
 * UOMs tab — list and inline create/edit/delete for item units of measure.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/components/resource-drawer/ResourceDrawerPanelHeader";
import { InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Table } from "antd";
import { useItemUomsPanel } from "./useItemUomsPanel";

/**
 * @param {{
 *   itemId: number;
 *   baseUomId?: number;
 *   readOnly: boolean;
 *   t: (k: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 *   queryEnabled?: boolean;
 * }} props
 */
export function ItemUomsPanel({ itemId, baseUomId, readOnly, t, tApiErrors, active, queryEnabled = false }) {
  const {
    isPending,
    tableData,
    columns,
    inlineEdit,
    baseRow,
    baseUnitLabel,
    getInlineValues,
    startCreateRow,
  } = useItemUomsPanel({ itemId, baseUomId, readOnly, t, tApiErrors, active, queryEnabled });

  return (
    <section>
      <ResourceDrawerPanelHeader
        title={t("tabUoms")}
        description={t("tabUomsDescription")}
        actions={
          !readOnly ? (
            <Button type="primary" ghost icon={<PlusOutlined />} disabled={Boolean(inlineEdit)} onClick={startCreateRow}>
              {t("panelAddUom")}
            </Button>
          ) : null
        }
      />
      <Table
        className="resource-drawer-data-table"
        rowKey="id"
        size="small"
        loading={isPending}
        pagination={false}
        dataSource={tableData}
        columns={columns}
        rowClassName={(r) => (getInlineValues(r) ? "resource-drawer-uom-row-editing" : "")}
      />
      {baseRow ? (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="!mt-3"
          title={t("uomConversionHint", { baseUnit: baseUnitLabel })}
        />
      ) : null}
    </section>
  );
}
