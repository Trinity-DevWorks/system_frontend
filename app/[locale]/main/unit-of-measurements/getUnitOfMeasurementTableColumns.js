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
const hasValue = (value) => value !== null && typeof value !== "undefined";
const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : "";

function getUnitGroupName(row) {
  const name = row?.unit_group?.name;
  return typeof name === "string" ? name.trim() : "";
}

function getUnitGroupCode(row) {
  const code = row?.unit_group?.code;
  return typeof code === "string" ? code.trim() : "";
}

function UnitGroupFilterDropdown({
  visible,
  unitGroupOptions,
  selectedUnitGroupId,
  onUnitGroupFilterChange,
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
    if (!normalizedSearch) return unitGroupOptions;

    return unitGroupOptions.filter((option) =>
      option.normalizedText.includes(normalizedSearch),
    );
  }, [unitGroupOptions, searchValue]);

  return (
    <div
      className="w-[300px] max-w-[calc(100vw-2rem)] p-2"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Input
        ref={searchInputRef}
        allowClear
        size="small"
        value={searchValue}
        placeholder={t("filterUnitGroupSearchPlaceholder")}
        aria-label={t("filterUnitGroupSearchPlaceholder")}
        onChange={(event) => setSearchValue(event.target.value)}
      />

      <div className="mt-2 max-h-56 overflow-y-auto pr-1">
        {filteredOptions.length ? (
          <Radio.Group
            value={selectedUnitGroupId}
            className="flex w-full flex-col gap-1"
            aria-label={t("filterUnitGroup")}
            onChange={(event) => {
              onUnitGroupFilterChange(event.target.value);
              onClose();
            }}
          >
            {filteredOptions.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                className="m-0 rounded-md px-2 py-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {option.name ? (
                      <Typography.Text ellipsis className="min-w-0">
                        {option.name}
                      </Typography.Text>
                    ) : null}
                    {option.code ? (
                      <Typography.Text code className="shrink-0 text-xs">
                        {option.code}
                      </Typography.Text>
                    ) : null}
                    {!option.name && !option.code ? (
                      <Typography.Text code className="shrink-0 text-xs">
                        #{option.id}
                      </Typography.Text>
                    ) : null}
                  </span>
                  {option.dimensionTypeLabel && option.dimensionTypeLabel !== "\u2014" ? (
                    <Typography.Text type="secondary" className="text-xs">
                      {option.dimensionTypeLabel}
                    </Typography.Text>
                  ) : null}
                </span>
              </Radio>
            ))}
          </Radio.Group>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Typography.Text type="secondary">
                {t("filterUnitGroupEmpty")}
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
          disabled={!selectedUnitGroupId && !searchValue}
          onClick={() => {
            setSearchValue("");
            onUnitGroupFilterChange(undefined);
          }}
        >
          {t("filterReset")}
        </Button>
      </div>
    </div>
  );
}

export function getUnitOfMeasurementDimensionTypeLabel(value, t) {
  const normalized = normalizeText(value);

  switch (normalized) {
    case "count":
      return t("dimensionCount");
    case "weight":
      return t("dimensionWeight");
    case "length":
      return t("dimensionLength");
    case "volume":
      return t("dimensionVolume");
    case "other":
      return t("dimensionOther");
    default:
      return normalized ? value.trim() : "\u2014";
  }
}

export function getUnitOfMeasurementStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("UnitOfMeasurements")`
 * @param {{
 *   unitGroupFilter?: {
 *     options: Array<{
 *       id: string | number;
 *       code: string;
 *       dimensionTypeLabel: string;
 *       name: string;
 *       normalizedText: string;
 *       value: string;
 *     }>;
 *     value?: string;
 *     onChange: (value?: string) => void;
 *   };
 * }} [options]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getUnitOfMeasurementTableColumns(t, options = {}) {
  const { unitGroupFilter } = options;

  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 72,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 140,
      ellipsis: true,
      render: (value) => {
        const v = typeof value === "string" ? value.trim() : "";
        return v ? (
          <Typography.Text code className="text-xs">
            {v}
          </Typography.Text>
        ) : (
          "\u2014"
        );
      },
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colSymbol"),
      dataIndex: "symbol",
      key: "symbol",
      width: 108,
      ellipsis: true,
      render: (value) => {
        const v = typeof value === "string" ? value.trim() : "";
        return v ? (
          <Typography.Text code className="text-xs">
            {v}
          </Typography.Text>
        ) : (
          "\u2014"
        );
      },
    },
    {
      title: t("colUnitGroup"),
      dataIndex: "unit_group_id",
      key: "unit_group",
      width: 260,
      ellipsis: true,
      filterOnClose: false,
      filterMultiple: false,
      filteredValue:
        unitGroupFilter?.value ? [unitGroupFilter.value] : null,
      filterDropdownProps: {
        destroyOnHidden: true,
        placement: "bottomLeft",
      },
      filterDropdown: ({ close, visible }) =>
        unitGroupFilter ? (
          <UnitGroupFilterDropdown
            visible={visible}
            unitGroupOptions={unitGroupFilter.options}
            selectedUnitGroupId={unitGroupFilter.value}
            onUnitGroupFilterChange={unitGroupFilter.onChange}
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
        const groupName = getUnitGroupName(record);
        const groupCode = getUnitGroupCode(record);
        if (!groupName && !groupCode && !hasValue(value)) return "\u2014";

        return (
          <span className="inline-flex min-w-0 items-center gap-2">
            {groupName ? (
              <Typography.Text ellipsis className="min-w-0">
                {groupName}
              </Typography.Text>
            ) : null}
            {groupCode ? (
              <Typography.Text code className="shrink-0 text-xs">
                {groupCode}
              </Typography.Text>
            ) : hasValue(value) ? (
              <Typography.Text code className="shrink-0 text-xs">
                #{value}
              </Typography.Text>
            ) : null}
          </span>
        );
      },
    },
    {
      title: t("colDimensionType"),
      key: "dimension_type",
      width: 150,
      ellipsis: true,
      render: (_, record) => (
        <Typography.Text ellipsis>
          {getUnitOfMeasurementDimensionTypeLabel(
            record?.unit_group?.dimension_type,
            t,
          )}
        </Typography.Text>
      ),
    },
    {
      title: t("colDecimalPlaces"),
      dataIndex: "decimal_places",
      key: "decimal_places",
      width: 120,
      sorter: (a, b) => a.decimal_places - b.decimal_places,
      render: (value) => (
        <Typography.Text code className="text-xs">
          {hasValue(value) ? value : "\u2014"}
        </Typography.Text>
      ),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) =>
        value ? (
          <Typography.Text strong>
            {getUnitOfMeasurementStatusLabel(value, t)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {getUnitOfMeasurementStatusLabel(value, t)}
          </Typography.Text>
        ),
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
      fixed: "end",
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
