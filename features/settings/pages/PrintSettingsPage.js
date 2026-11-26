"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { DeleteOutlined, EditOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Input, Modal, Select, Spin, Switch, Table, Tooltip, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  PRINT_SETTINGS_QUERY_KEY,
  deletePrintSettingsType,
  fetchPrintSettings,
  updatePrintSettings,
  updatePrintSettingsType,
} from "../api/printSettings.api";

const SWITCHES = ["show_logo", "show_tax_number", "show_address", "show_signatures"];
const FIELDS = ["paper", ...SWITCHES, "footer_text", "terms_text"];
const PAGE_PAPERS = ["a4", "a5", "letter"];
const ROLL_PAPERS = ["roll80", "roll58"];

/** @param {Record<string, any> | null | undefined} row */
function pickFields(row) {
  return Object.fromEntries(FIELDS.map((k) => [k, row?.[k] ?? null]));
}

/**
 * The print fields shared by the company default and a document type's own settings.
 * @param {{ t: (key: string) => string; papers: string[] }} props
 */
function PrintFields({ t, papers }) {
  return (
    <>
      <Form.Item name="paper" label={t("paper")} tooltip={t("paperHint")} rules={[{ required: true }]}>
        <Select className="!w-56" options={papers.map((value) => ({ value, label: t(`paper_${value}`) }))} />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {SWITCHES.map((name) => (
          <Form.Item key={name} name={name} label={t(name)} valuePropName="checked">
            <Switch />
          </Form.Item>
        ))}
      </div>
      <Form.Item name="footer_text" label={t("footer_text")} tooltip={t("footerHint")}>
        <Input maxLength={500} showCount />
      </Form.Item>
      <Form.Item name="terms_text" label={t("terms_text")} tooltip={t("termsHint")}>
        <Input.TextArea rows={4} maxLength={5000} />
      </Form.Item>
    </>
  );
}

export default function PrintSettingsPage() {
  const t = useTranslations("PrintSettings");
  const tTypes = useTranslations("DocumentNumbering");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal } = App.useApp();
  const access = useResourceAccess("print_settings");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [typeForm] = Form.useForm();
  /** @type {[{ type: string | null } | null, (v: { type: string | null } | null) => void]} */
  const [editing, setEditing] = useState(null);

  const query = useQuery({ queryKey: PRINT_SETTINGS_QUERY_KEY, queryFn: fetchPrintSettings });
  const data = query.data;
  const readOnly = !access.canEdit;

  useEffect(() => {
    if (data) form.setFieldsValue(pickFields(data));
  }, [data, form]);

  /** @type {Array<{ value: string; receipt: boolean }>} */
  const documentTypes = useMemo(() => (Array.isArray(data?.document_types) ? data.document_types : []), [data]);
  /** @type {Array<Record<string, any>>} */
  const overrides = useMemo(() => (Array.isArray(data?.overrides) ? data.overrides : []), [data]);
  const typeLabel = (/** @type {string} */ value) => tTypes(`type_${value}`);
  const hasReceipt = (/** @type {string | null | undefined} */ value) => documentTypes.some((d) => d.value === value && d.receipt);

  const onSaved = (/** @type {Record<string, any>} */ next) => {
    queryClient.setQueryData(PRINT_SETTINGS_QUERY_KEY, next);
    notification.success({ title: t("saved") });
  };
  const onError = (/** @type {unknown} */ error) =>
    notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });

  const saveDefault = useMutation({ mutationFn: updatePrintSettings, onSuccess: onSaved, onError });
  const saveType = useMutation({
    mutationFn: (/** @type {{ type: string; values: Record<string, unknown> }} */ v) => updatePrintSettingsType(v.type, v.values),
    onSuccess: (next) => {
      onSaved(next);
      setEditing(null);
    },
    onError,
  });
  const removeType = useMutation({ mutationFn: deletePrintSettingsType, onSuccess: onSaved, onError });

  const openType = (/** @type {Record<string, any> | null} */ row) => {
    // A new type starts from the company default.
    typeForm.resetFields();
    typeForm.setFieldsValue({ document_type: row?.document_type ?? undefined, ...pickFields(row ?? data) });
    setEditing({ type: row?.document_type ?? null });
  };

  const confirmRemove = (/** @type {string} */ type) =>
    modal.confirm({
      title: t("removeConfirm", { type: typeLabel(type) }),
      okText: t("remove"),
      okButtonProps: { danger: true },
      onOk: () => removeType.mutateAsync(type),
    });

  const selectedType = Form.useWatch("document_type", typeForm);
  const typePapers = hasReceipt(selectedType) ? [...PAGE_PAPERS, ...ROLL_PAPERS] : PAGE_PAPERS;
  const freeTypes = documentTypes.filter((d) => !overrides.some((o) => o.document_type === d.value));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <Typography.Title level={4} className="!mb-0">
        {t("title")}
      </Typography.Title>
      <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
      {query.isError ? <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, query.error)} /> : null}
      {query.isPending ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <>
          <Card className="max-w-3xl" title={t("defaultsTitle")}>
            <Form form={form} layout="vertical" disabled={readOnly} onFinish={(values) => saveDefault.mutate(values)}>
              <PrintFields t={t} papers={PAGE_PAPERS} />
              {readOnly ? null : (
                <Button type="primary" htmlType="submit" loading={saveDefault.isPending}>
                  {t("save")}
                </Button>
              )}
            </Form>
          </Card>

          <Card
            className="max-w-3xl"
            title={
              <span className="inline-flex items-center gap-1.5">
                {t("overridesTitle")}
                <Tooltip title={t("overridesHelp")}>
                  <QuestionCircleOutlined className="text-xs opacity-60" />
                </Tooltip>
              </span>
            }
            extra={
              readOnly ? null : (
                <Button icon={<PlusOutlined />} disabled={freeTypes.length === 0} onClick={() => openType(null)}>
                  {t("addOverride")}
                </Button>
              )
            }
          >
            <Table
              size="small"
              rowKey="document_type"
              pagination={false}
              dataSource={overrides}
              locale={{ emptyText: t("noOverrides") }}
              columns={[
                { title: t("documentType"), dataIndex: "document_type", render: (v) => typeLabel(v) },
                { title: t("paper"), dataIndex: "paper", width: 170, render: (v) => t(`paper_${v}`) },
                {
                  title: t("footer_text"),
                  dataIndex: "footer_text",
                  ellipsis: true,
                  render: (v) => v || <Typography.Text type="secondary">—</Typography.Text>,
                },
                {
                  key: "actions",
                  width: 90,
                  align: "end",
                  render: (_, row) =>
                    readOnly ? null : (
                      <span className="inline-flex gap-1">
                        <Button size="small" type="text" icon={<EditOutlined />} aria-label={t("edit")} onClick={() => openType(row)} />
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={t("remove")}
                          onClick={() => confirmRemove(row.document_type)}
                        />
                      </span>
                    ),
                },
              ]}
            />
          </Card>
        </>
      )}

      <Modal
        open={editing !== null}
        title={editing?.type ? typeLabel(editing.type) : t("addOverride")}
        okText={t("save")}
        confirmLoading={saveType.isPending}
        width={640}
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => typeForm.submit()}
      >
        <Form
          form={typeForm}
          layout="vertical"
          onValuesChange={(changed, all) => {
            // A type without a receipt layout can't keep a roll paper.
            if ("document_type" in changed && ROLL_PAPERS.includes(all.paper) && !hasReceipt(changed.document_type)) {
              typeForm.setFieldValue("paper", "a4");
            }
          }}
          onFinish={(values) => {
            const { document_type: type, ...rest } = values;
            saveType.mutate({ type, values: rest });
          }}
        >
          <Form.Item name="document_type" label={t("documentType")} rules={[{ required: true }]}>
            <Select
              showSearch={{ optionFilterProp: "label" }}
              disabled={Boolean(editing?.type)}
              options={(editing?.type ? documentTypes : freeTypes).map((d) => ({ value: d.value, label: typeLabel(d.value) }))}
            />
          </Form.Item>
          <PrintFields t={t} papers={typePapers} />
        </Form>
      </Modal>
    </div>
  );
}
