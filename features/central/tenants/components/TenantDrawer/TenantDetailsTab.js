"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { Descriptions, Form, Input, Space, Tag, Typography } from "antd";

/**
 * Tenant name (editable in edit mode) plus read-only workspace facts.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   record: Record<string, unknown> | null;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function TenantDetailsTab({ form, record, readOnly, t }) {
  const domains = Array.isArray(record?.domains) ? /** @type {string[]} */ (record.domains) : [];
  const owner =
    record?.owner && typeof record.owner === "object"
      ? /** @type {{ name?: string; email?: string }} */ (record.owner)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
        <Form.Item
          name="name"
          label={t("fieldName")}
          rules={[
            { required: true, whitespace: true, message: t("fieldNameRequired") },
            { max: 255, message: t("fieldNameMax") },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
      </Form>

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t("colId")}>
          <Typography.Text code copyable>
            {String(record?.id ?? "")}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("fieldDomains")}>
          {domains.length ? (
            <Space size={[4, 4]} wrap>
              {domains.map((domain) => (
                <Tag key={domain}>{domain}</Tag>
              ))}
            </Space>
          ) : (
            "\u2014"
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t("fieldOwner")}>
          {owner ? (
            <div className="flex flex-col">
              <Typography.Text>{owner.name || "\u2014"}</Typography.Text>
              {owner.email ? (
                <Typography.Text type="secondary" className="text-xs">
                  {owner.email}
                </Typography.Text>
              ) : null}
            </div>
          ) : (
            "\u2014"
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t("colCreatedAt")}>
          {formatTenantDateTime(record?.created_at) || "\u2014"}
        </Descriptions.Item>
        <Descriptions.Item label={t("colUpdatedAt")}>
          {formatTenantDateTime(record?.updated_at) || "\u2014"}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}
