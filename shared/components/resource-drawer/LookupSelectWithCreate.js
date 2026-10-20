"use client";

import LookupFieldWithAddFooter from "@/shared/components/resource-drawer/LookupFieldWithAddFooter";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import { PlusOutlined } from "@ant-design/icons";
import { Form, Select } from "antd";
import { useCallback, useMemo } from "react";

/**
 * Select with optional "add new" — in the dropdown (default) or as a footer inside the field box.
 * Pass `fetchPage` for server-side search + pagination instead of a full options list.
 * @param {{
 *   form: import("antd").FormInstance;
 *   name: string;
 *   label: import("react").ReactNode;
 *   rules?: import("antd").FormRule[];
 *   readOnly: boolean;
 *   addNewSentinel?: string | null;
 *   addNewLabel?: string;
 *   onAddNew?: () => void;
 *   addNewAsLink?: boolean;
 *   options?: { value: unknown; label: string; disabled?: boolean }[];
 *   fetchPage?: (args: { search: string; page: number }) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
 *   queryKey?: readonly unknown[];
 *   queryParams?: Record<string, string | number | boolean | undefined>;
 *   recentKind?: string;
 *   seedOptions?: Record<string, unknown>[];
 *   recentLabel?: string;
 *   clearRecentLabel?: string;
 *   resultsLabel?: string;
 *   loadMoreLabel?: string;
 *   emptyLabel?: string;
 *   typeToSearchLabel?: string;
 *   placeholder?: string;
 *   loading?: boolean;
 *   allowClear?: boolean;
 *   showSearch?: boolean;
 *   getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
 * }} props
 */
export default function LookupSelectWithCreate({
  form,
  name,
  label,
  rules,
  readOnly,
  addNewSentinel = null,
  addNewLabel,
  onAddNew,
  addNewAsLink = false,
  options = [],
  fetchPage,
  queryKey,
  queryParams,
  recentKind,
  seedOptions,
  recentLabel,
  clearRecentLabel,
  resultsLabel,
  loadMoreLabel,
  emptyLabel,
  typeToSearchLabel,
  placeholder,
  loading,
  allowClear = true,
  showSearch = true,
  getPopupContainer,
}) {
  const sentinel = addNewSentinel != null && !readOnly ? String(addNewSentinel) : null;
  const showAddNewFooter = Boolean(addNewAsLink && sentinel && addNewLabel && onAddNew);
  const serverSearch = typeof fetchPage === "function";

  const selectOptions = useMemo(() => {
    if (addNewAsLink || !sentinel || !addNewLabel || !onAddNew) return options;
    return [
      { value: sentinel, label: addNewLabel, className: "lookup-select-add-new-option" },
      ...options,
    ];
  }, [addNewAsLink, sentinel, addNewLabel, onAddNew, options]);

  const optionRender = useCallback(
    (option) => {
      if (sentinel && option.value === sentinel) {
        return (
          <span className="lookup-select-add-new">
            <PlusOutlined />
            {addNewLabel}
          </span>
        );
      }
      return option.label;
    },
    [addNewLabel, sentinel],
  );

  const getValueFromEvent =
    sentinel && !addNewAsLink
      ? (/** @type {unknown} */ v) => (v === sentinel ? form.getFieldValue(name) : v)
      : undefined;

  const onSelect =
    sentinel && onAddNew && !addNewAsLink && !serverSearch
      ? (/** @type {unknown} */ value) => {
          if (value === sentinel) onAddNew();
        }
      : undefined;

  const select = serverSearch ? (
    <ServerSearchSelect
      fetchPage={fetchPage}
      queryKey={queryKey}
      queryParams={queryParams}
      recentKind={recentKind}
      seedOptions={seedOptions}
      recentLabel={recentLabel}
      clearRecentLabel={clearRecentLabel}
      resultsLabel={resultsLabel}
      loadMoreLabel={loadMoreLabel}
      emptyLabel={emptyLabel}
      typeToSearchLabel={typeToSearchLabel}
      allowClear={allowClear}
      placeholder={placeholder}
      disabled={readOnly}
      loading={loading}
      addNewSentinel={!addNewAsLink ? sentinel : null}
      addNewLabel={addNewLabel}
      onAddNew={onAddNew}
      getPopupContainer={getPopupContainer}
      variant={showAddNewFooter ? "borderless" : undefined}
      className={showAddNewFooter ? "lookup-field-composite-select-input w-full" : "w-full"}
    />
  ) : (
    <Select
      allowClear={allowClear}
      showSearch={showSearch}
      optionFilterProp="label"
      loading={loading}
      placeholder={placeholder}
      options={selectOptions}
      optionRender={sentinel && !addNewAsLink ? optionRender : undefined}
      onSelect={onSelect}
      getPopupContainer={getPopupContainer}
      variant={showAddNewFooter ? "borderless" : undefined}
      className={showAddNewFooter ? "lookup-field-composite-select-input w-full" : "w-full"}
    />
  );

  return (
    <Form.Item name={name} label={label} rules={rules} getValueFromEvent={getValueFromEvent}>
      <LookupFieldWithAddFooter
        showFooter={showAddNewFooter}
        addNewLabel={addNewLabel}
        onAddNew={onAddNew}
      >
        {select}
      </LookupFieldWithAddFooter>
    </Form.Item>
  );
}
