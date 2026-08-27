"use client";

import LookupFieldWithAddFooter from "@/shared/components/resource-drawer/LookupFieldWithAddFooter";
import { Form, Select } from "antd";
import { useMemo } from "react";

/**
 * Select with optional "add new" — in the dropdown (default) or as a footer inside the field box.
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
 *   options: { value: unknown; label: string; disabled?: boolean }[];
 *   placeholder?: string;
 *   loading?: boolean;
 *   allowClear?: boolean;
 *   showSearch?: boolean;
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
  options,
  placeholder,
  loading,
  allowClear = true,
  showSearch = true,
}) {
  const sentinel = addNewSentinel != null && !readOnly ? String(addNewSentinel) : null;
  const showAddNewFooter = Boolean(addNewAsLink && sentinel && addNewLabel && onAddNew);

  const selectOptions = useMemo(() => {
    if (addNewAsLink || !sentinel || !addNewLabel || !onAddNew) return options;
    return [{ value: sentinel, label: addNewLabel }, ...options];
  }, [addNewAsLink, sentinel, addNewLabel, onAddNew, options]);

  const getValueFromEvent =
    sentinel && !addNewAsLink
      ? (/** @type {unknown} */ v) => (v === sentinel ? form.getFieldValue(name) : v)
      : undefined;

  const onSelect =
    sentinel && onAddNew && !addNewAsLink
      ? (/** @type {unknown} */ value) => {
          if (value === sentinel) onAddNew();
        }
      : undefined;

  const select = (
    <Select
      allowClear={allowClear}
      showSearch={showSearch}
      optionFilterProp="label"
      loading={loading}
      placeholder={placeholder}
      options={selectOptions}
      onSelect={onSelect}
      variant={showAddNewFooter ? "borderless" : undefined}
      className={showAddNewFooter ? "lookup-field-composite-select-input" : undefined}
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
