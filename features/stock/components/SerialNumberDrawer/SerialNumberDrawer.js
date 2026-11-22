"use client";

import { SOURCE_DOCUMENT_FEATURE } from "@/features/accounting/accountingUtils";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantDateTime } from "@/lib/tenant-format";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerTabs from "@/shared/components/resource-drawer/ResourceDrawerTabs";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Col, DatePicker, Form, Input, Row, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SERIAL_STATUS_COLORS, fetchSerial, serialQueryKey, updateSerial } from "../../api/serials.api";
import StockDocumentDrawerFooter from "../StockDocumentDrawerFooter";

export const STOCK_SERIALS_QUERY_KEY = ["tenant", "stock-serials"];

/**
 * One serial-numbered unit: where it came from, where it went, its warranty and its full history.
 * Only the warranty end date and notes can be changed (edit mode).
 *
 * @param {{
 *   open: boolean;
 *   mode: "view" | "edit" | "create";
 *   serialId: number | null;
 *   tableSeedRecord?: Record<string, any> | null;
 *   onClose: () => void;
 * }} props
 */
export default function SerialNumberDrawer({ open, mode, serialId, tableSeedRecord = null, onClose }) {
  const t = useTranslations("SerialNumbers");
  const tApiErrors = useTranslations("ApiErrors");
  const { modal, notification } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("stock");
  const { openStackedDrawer } = useGlobalDrawer();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("details");
  const readOnly = mode !== "edit" || !access.canEdit;

  const detail = useQuery({
    queryKey: serialQueryKey(serialId ?? ""),
    queryFn: () => fetchSerial(/** @type {number} */ (serialId)),
    enabled: open && serialId != null,
    placeholderData: tableSeedRecord ?? undefined,
  });
  const record = detail.data;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      warranty_ends_on: record.warranty_ends_on ? dayjs(record.warranty_ends_on) : null,
      notes: record.notes ?? "",
    });
  }, [record, form]);

  const save = useMutation({
    mutationFn: (values) =>
      updateSerial(/** @type {number} */ (serialId), {
        warranty_ends_on: values.warranty_ends_on ? values.warranty_ends_on.format("YYYY-MM-DD") : null,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(serialQueryKey(serialId ?? ""), saved);
      queryClient.invalidateQueries({ queryKey: STOCK_SERIALS_QUERY_KEY });
      notification.success({ title: t("saved") });
      form.resetFields();
      onClose();
    },
    onError: (error) =>
      notification.error({ title: t("saveFailed"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: () => {
      setActiveTab("details");
      form.resetFields();
      onClose();
    },
    shouldConfirmDiscard: () => form.isFieldsTouched(),
  });

  /** @param {{ type: string; id: string; number?: string | null } | null | undefined} ref */
  const docLink = (ref) => {
    if (!ref) return "—";
    const label = ref.number || t(`ref_${ref.type}`);
    const featureId = SOURCE_DOCUMENT_FEATURE[/** @type {keyof typeof SOURCE_DOCUMENT_FEATURE} */ (ref.type)];
    if (!featureId) return label;
    return (
      <Button
        type="link"
        disabled={false}
        className="!h-auto !p-0"
        onClick={() => openStackedDrawer({ featureId, id: String(ref.id), mode: "view" })}
      >
        {label}
      </Button>
    );
  };

  /** @param {{ id: string; name: string } | null | undefined} party @param {string} featureId */
  const partyLink = (party, featureId) =>
    party ? (
      <Button
        type="link"
        disabled={false}
        className="!h-auto !p-0"
        onClick={() => openStackedDrawer({ featureId, id: String(party.id), mode: "view" })}
      >
        {party.name}
      </Button>
    ) : (
      "—"
    );

  const warrantyTag =
    record?.in_warranty == null ? null : (
      <Tag color={record.in_warranty ? "green" : "default"} className="!ms-2">
        {record.in_warranty ? t("inWarranty") : t("warrantyExpired")}
      </Tag>
    );

  const historyColumns = [
    {
      title: t("colDate"),
      dataIndex: "moved_at",
      width: 170,
      render: (value) => formatTenantDateTime(value),
    },
    {
      title: t("colMovement"),
      key: "movement",
      render: (_, row) => (
        <span>
          {t(`move_${row.movement_type}`)}
          {row.is_reversal ? <Tag className="!ms-2">{t("reversal")}</Tag> : null}
          {row.reversed ? <Tag className="!ms-2">{t("reversed")}</Tag> : null}
        </span>
      ),
    },
    { title: t("colDocument"), key: "doc", width: 170, render: (_, row) => docLink(row.reference) },
    { title: t("colWarehouse"), key: "warehouse", width: 150, render: (_, row) => row.warehouse?.name ?? "—" },
    {
      title: t("colStatusAfter"),
      dataIndex: "status_after",
      width: 150,
      render: (value) => <Tag color={SERIAL_STATUS_COLORS[value]}>{t(`status_${value}`)}</Tag>,
    },
    { title: t("colUser"), key: "user", width: 140, render: (_, row) => row.user?.name ?? "—" },
  ];

  const field = (label, value, help = undefined) => (
    <Form.Item label={label} tooltip={help}>
      <div className="flex min-h-8 items-center">{value}</div>
    </Form.Item>
  );

  return (
    <ResourceCrudDrawer
      title={record?.serial_number ? `${t("drawerTitle")} ${record.serial_number}` : t("drawerTitle")}
      open={open}
      requestClose={requestClose}
      submitting={save.isPending}
      showExpand
      showDetailLoading={detail.isPending && !record}
      detailLoadFailed={detail.isError}
      detailError={detail.error}
      tApiErrors={tApiErrors}
      headerExtra={
        record?.status ? <Tag color={SERIAL_STATUS_COLORS[record.status]}>{t(`status_${record.status}`)}</Tag> : null
      }
      size={960}
      footer={
        <StockDocumentDrawerFooter
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={save.isPending}
          onSave={() => form.validateFields().then((values) => save.mutate(values)).catch(() => {})}
        />
      }
    >
      <div className="-mt-3">
        <ResourceDrawerTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "details",
              label: t("tabDetails"),
              hidePanelHeading: true,
              children: (
                <Form form={form} layout="vertical" requiredMark={false} disabled={readOnly || save.isPending}>
                  <Row gutter={[24, 0]}>
                    <Col xs={24} md={12}>
                      {field(t("fieldItem"), record?.item ? (
                        <Button
                          type="link"
                          disabled={false}
                          className="!h-auto !p-0"
                          onClick={() => openStackedDrawer({ featureId: "items", id: String(record.item.id), mode: "view" })}
                        >
                          {[record.item.item_code, record.item.name].filter(Boolean).join(" — ")}
                        </Button>
                      ) : "—")}
                    </Col>
                    <Col xs={24} md={12}>
                      {field(t("fieldWarehouse"), record?.warehouse?.name ?? "—", t("fieldWarehouseHelp"))}
                    </Col>
                    <Col xs={24} md={12}>{field(t("fieldSupplier"), partyLink(record?.supplier, "suppliers"))}</Col>
                    <Col xs={24} md={12}>
                      {field(
                        t("fieldReceived"),
                        record?.received_at ? (
                          <span>
                            {formatTenantDate(record.received_at)} · {docLink(record.received_ref)}
                          </span>
                        ) : "—",
                      )}
                    </Col>
                    <Col xs={24} md={12}>{field(t("fieldCustomer"), partyLink(record?.customer, "customers"))}</Col>
                    <Col xs={24} md={12}>
                      {field(
                        t("fieldSold"),
                        record?.sold_at ? (
                          <span>
                            {formatTenantDate(record.sold_at)} · {docLink(record.sold_ref)}
                          </span>
                        ) : "—",
                      )}
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="warranty_ends_on"
                        label={
                          <span>
                            {t("fieldWarrantyEnds")}
                            {warrantyTag}
                          </span>
                        }
                        tooltip={t("fieldWarrantyEndsHelp")}
                      >
                        <DatePicker className="w-full" format={dayjsDatePattern()} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="notes" label={t("fieldNotes")}>
                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={2000} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: "history",
              label: t("tabHistory"),
              hidePanelHeading: true,
              children: (
                <Table
                  size="small"
                  rowKey="id"
                  columns={historyColumns}
                  dataSource={Array.isArray(record?.history) ? record.history : []}
                  pagination={false}
                  scroll={{ x: 900 }}
                  locale={{ emptyText: t("historyEmpty") }}
                />
              ),
            },
          ]}
        />
      </div>
    </ResourceCrudDrawer>
  );
}
