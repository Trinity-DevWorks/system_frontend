import {
  DeleteOutlined,
  EditOutlined,
  FilterFilled,
  FilterOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Empty, Input, Radio, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const getCategoryName = (row) => {
  const name = row?.category?.name;
  return typeof name === "string" ? name.trim() : "";
};

const hasValue = (value) => value !== null && typeof value !== "undefined";
const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : "";

function CategoryFilterDropdown({
  visible,
  categoryOptions,
  selectedCategoryId,
  onCategoryFilterChange,
  onClose,
  t,
}) {
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    const frameId = requestAnimationFrame(() => {
      searchInputRef.current?.focus?.();
    });

    return () => cancelAnimationFrame(frameId);
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = normalizeText(searchValue);
    if (!normalizedSearch) return categoryOptions;

    return categoryOptions.filter((option) =>
      option.normalizedName.includes(normalizedSearch),
    );
  }, [categoryOptions, searchValue]);

  return (
    <div
      className="w-[280px] max-w-[calc(100vw-2rem)] p-2"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Input
        ref={searchInputRef}
        allowClear
        size="small"
        value={searchValue}
        placeholder={t("filterCategorySearchPlaceholder")}
        aria-label={t("filterCategorySearchPlaceholder")}
        onChange={(event) => setSearchValue(event.target.value)}
      />

      <div className="mt-2 max-h-56 overflow-y-auto pr-1">
        {filteredOptions.length ? (
          <Radio.Group
            value={selectedCategoryId}
            className="flex w-full flex-col gap-1"
            aria-label={t("filterCategory")}
            onChange={(event) => {
              onCategoryFilterChange(event.target.value);
              onClose();
            }}
          >
            {filteredOptions.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                className="m-0 rounded-md px-2 py-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {option.name ? (
                    <Typography.Text ellipsis className="min-w-0">
                      {option.name}
                    </Typography.Text>
                  ) : null}
                  <Typography.Text code className="shrink-0 text-xs">
                    #{option.id}
                  </Typography.Text>
                </span>
              </Radio>
            ))}
          </Radio.Group>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Typography.Text type="secondary">
                {t("filterCategoryEmpty")}
              </Typography.Text>
            }
            className="my-3"
          />
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <Button
          type="link"
          size="small"
          disabled={!selectedCategoryId && !searchValue}
          onClick={() => {
            setSearchValue("");
            onCategoryFilterChange(undefined);
          }}
        >
          {t("filterReset")}
        </Button>
      </div>
    </div>
  );
}

/**
 * @param {(key: string) => string} t `useTranslations("SubCategories")`
 * @param {{
 *   categoryFilter?: {
 *     options: Array<{
 *       id: string | number;
 *       name: string;
 *       normalizedName: string;
 *       value: string;
 *     }>;
 *     value?: string;
 *     onChange: (value?: string) => void;
 *   };
 * }} [options]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getSubCategoryTableColumns(t, options = {}) {
  const { categoryFilter } = options;

  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 72,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colCategory"),
      dataIndex: "category_id",
      key: "category",
      width: 240,
      ellipsis: true,
      filterOnClose: false,
      filterMultiple: false,
      filteredValue:
        categoryFilter?.value ? [categoryFilter.value] : null,
      filterDropdownProps: {
        destroyOnHidden: true,
        placement: "bottomLeft",
      },
      filterDropdown: ({ close, visible }) =>
        categoryFilter ? (
          <CategoryFilterDropdown
            visible={visible}
            categoryOptions={categoryFilter.options}
            selectedCategoryId={categoryFilter.value}
            onCategoryFilterChange={categoryFilter.onChange}
            onClose={close}
            t={t}
          />
        ) : null,
      filterIcon: (filtered) => (
        <span
          aria-hidden
          className={`inline-flex size-6 items-center justify-center rounded-md border transition-colors ${
            filtered
              ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300"
              : "border-transparent text-black/45 hover:border-black/10 hover:bg-black/[0.03] dark:text-white/45 dark:hover:border-white/10 dark:hover:bg-white/[0.06]"
          }`}
        >
          {filtered ? <FilterFilled /> : <FilterOutlined />}
        </span>
      ),
      render: (value, record) => {
        const categoryName = getCategoryName(record);
        if (!categoryName && !hasValue(value)) return "\u2014";

        return (
          <span className="inline-flex min-w-0 items-center gap-2">
            {categoryName ? (
              <Typography.Text ellipsis className="min-w-0">
                {categoryName}
              </Typography.Text>
            ) : null}
            {hasValue(value) ? (
              <Typography.Text code className="shrink-0 text-xs">
                #{value}
              </Typography.Text>
            ) : null}
          </span>
        );
      },
    },
    {
      title: t("colColor"),
      dataIndex: "color",
      key: "color",
      width: 200,
      render: (value) => {
        if (!value || typeof value !== "string") return "\u2014";
        const v = value.trim();
        return (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-4 shrink-0 rounded border border-black/10 dark:border-white/20"
              style={{ backgroundColor: v }}
              aria-hidden
            />
            <Typography.Text code copyable className="text-xs">
              {v}
            </Typography.Text>
          </span>
        );
      },
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "\u2014"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 168,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "\u2014"),
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      align: "center",
      render: () => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "edit",
                label: t("actionEdit"),
                icon: <EditOutlined />,
                disabled: true,
              },
              { type: "divider" },
              {
                key: "delete",
                label: t("actionDelete"),
                icon: <DeleteOutlined />,
                danger: true,
                disabled: true,
              },
            ],
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            aria-label={t("actionMenu")}
          />
        </Dropdown>
      ),
    },
  ];
}
