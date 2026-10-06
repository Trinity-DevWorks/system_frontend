import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  RollbackOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { getSalesCreditNoteStatusLabel, isSalesCreditNoteDraft, salesCreditNoteStatusTagColor } from "../../utils/salesCreditNoteStatuses";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onPost?: (record: unknown) => void;
 *   onReverse?: (record: unknown) => void;
 * }} [actions]
 */
export function getSalesCreditNoteTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onPost, onReverse } = actions;

  return [
    {
      title: t("colNumber"),
      dataIndex: "credit_note_number",
      key: "credit_note_number",
      width: 140,
      ellipsis: true,
      sorter: (a, b) => String(a.credit_note_number ?? "").localeCompare(String(b.credit_note_number ?? "")),
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
      title: t("colDate"),
      dataIndex: "credit_date",
      key: "credit_date",
      width: 120,
      sorter: (a, b) => toTime(a.credit_date) - toTime(b.credit_date),
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    {
      title: t("colInvoice"),
      key: "invoice_number",
      width: 140,
      ellipsis: true,
      render: (_, record) => record?.sales_invoice?.invoice_number || "\u2014",
    },
    {
      title: t("colCustomer"),
      dataIndex: "customer_name",
      key: "customer_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value) => (
        <Tag color={salesCreditNoteStatusTagColor(value)} className="!m-0">
          {getSalesCreditNoteStatusLabel(t, value)}
        </Tag>
      ),
    },
    {
      title: t("colGrandTotal"),
      dataIndex: "grand_total",
      key: "grand_total",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.grand_total ?? 0) - Number(b.grand_total ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => formatTenantDateTime(value) || "\u2014",
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_, record) => {
        const isDraft = isSalesCreditNoteDraft(record?.status);
        const items = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: t("actionView"),
            onClick: () => onView?.(record),
          },
          ...(isDraft
            ? [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: t("actionEdit"),
                  onClick: () => onEdit?.(record),
                },
                ...(onPost
                  ? [
                      {
                        key: "post",
                        icon: <SendOutlined />,
                        label: t("actionPost"),
                        onClick: () => onPost(record),
                      },
                    ]
                  : []),
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  danger: true,
                  label: t("actionDelete"),
                  onClick: () => onDelete?.(record),
                },
              ]
            : []),
          ...(onReverse && record?.status === "posted" && record?.can_reverse !== false
            ? [
                {
                  key: "reverse",
                  icon: <RollbackOutlined />,
                  danger: true,
                  label: t("actionReverse"),
                  onClick: () => onReverse(record),
                },
              ]
            : []),
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={t("actionMenu")}
              onClick={(event) => event.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];
}
