import { CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined, RollbackOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag } from "antd";

const STATUS_COLORS = { draft: "default", posted: "green", reversed: "red" };

/**
 * Status tag for draft / posted / reversed documents.
 *
 * @param {unknown} status
 * @param {(key: string) => string} t
 */
export function renderDocumentStatus(status, t) {
  const s = typeof status === "string" ? status : "draft";
  return <Tag color={STATUS_COLORS[s] ?? "default"}>{t(`status_${s}`)}</Tag>;
}

/**
 * Row action menu for draft -> posted -> reversed documents.
 *
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: any) => void;
 *   onEdit?: (record: any) => void;
 *   onDelete?: (record: any) => void;
 *   onPost?: (record: any) => void;
 *   onReverse?: (record: any) => void;
 *   extra?: (record: any) => Array<Record<string, unknown>>;
 * }} actions
 */
export function documentActionsColumn(t, actions) {
  const { onView, onEdit, onDelete, onPost, onReverse, extra } = actions;
  return {
    title: t("colActions"),
    key: "actions",
    fixed: "end",
    width: 72,
    align: "center",
    render: (_, record) => {
      const draft = record?.status === "draft";
      const posted = record?.status === "posted";
      return (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "view", label: t("actionView"), icon: <EyeOutlined />, disabled: !onView, onClick: () => onView?.(record) },
              { key: "edit", label: t("actionEdit"), icon: <EditOutlined />, disabled: !onEdit || !draft, onClick: () => onEdit?.(record) },
              { key: "post", label: t("actionPost"), icon: <CheckCircleOutlined />, disabled: !onPost || !draft, onClick: () => onPost?.(record) },
              { key: "reverse", label: t("actionReverse"), icon: <RollbackOutlined />, disabled: !onReverse || !posted, onClick: () => onReverse?.(record) },
              ...(extra ? extra(record) : []),
              { type: "divider" },
              { key: "delete", label: t("actionDelete"), icon: <DeleteOutlined />, danger: true, disabled: !onDelete || !draft, onClick: () => onDelete?.(record) },
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      );
    },
  };
}
