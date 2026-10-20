"use client";

import { ExportOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import { useTranslations } from "next-intl";

/**
 * Same Export menu the data-table header uses: one button, Excel and PDF inside.
 *
 * @param {{
 *   onExportExcel?: () => void,
 *   onExportPdf?: () => void,
 *   loading?: boolean,
 * }} props
 */
export default function TableExportMenu({ onExportExcel, onExportPdf, loading = false }) {
  const t = useTranslations("DataTable");

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: [
          { key: "export-excel", icon: <FileExcelOutlined />, label: t("exportExcel") },
          { key: "export-pdf", icon: <FilePdfOutlined />, label: t("exportPdf") },
        ],
        onClick: ({ key }) => {
          if (key === "export-excel") onExportExcel?.();
          else if (key === "export-pdf") onExportPdf?.();
        },
      }}
    >
      <Button icon={<ExportOutlined />} loading={loading} aria-label={t("exportMenu")}>
        {t("exportMenu")}
      </Button>
    </Dropdown>
  );
}
