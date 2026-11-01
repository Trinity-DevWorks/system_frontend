"use client";

import LookupFieldWithAddFooter from "@/shared/components/resource-drawer/LookupFieldWithAddFooter";
import { Form, TreeSelect } from "antd";
import { useMemo, useState } from "react";

/**
 * TreeSelect with optional "add new" — in the tree (default) or as a footer inside the field box.
 *
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
 *   treeData: import("antd").TreeSelectProps["treeData"];
 *   placeholder?: string;
 *   loading?: boolean;
 *   allowClear?: boolean;
 *   showSearch?: boolean;
 *   treeDefaultExpandAll?: boolean;
 * }} props
 */
export default function LookupTreeSelectWithCreate({
  form,
  name,
  label,
  rules,
  readOnly,
  addNewSentinel = null,
  addNewLabel,
  onAddNew,
  addNewAsLink = false,
  treeData,
  placeholder,
  loading,
  allowClear = true,
  showSearch = true,
  treeDefaultExpandAll = true,
}) {
  const sentinel = addNewSentinel != null && !readOnly ? String(addNewSentinel) : null;
  const showAddNewFooter = Boolean(addNewAsLink && sentinel && addNewLabel && onAddNew);

  const mergedTreeData = useMemo(() => {
    if (addNewAsLink || !sentinel || !addNewLabel || !onAddNew) return treeData ?? [];
    return [
      {
        value: sentinel,
        title: addNewLabel,
        selectable: true,
        disabled: false,
      },
      ...(treeData ?? []),
    ];
  }, [addNewAsLink, sentinel, addNewLabel, onAddNew, treeData]);

  const getValueFromEvent =
    sentinel && !addNewAsLink
      ? (/** @type {unknown} */ v) => (v === sentinel ? form.getFieldValue(name) : v)
      : undefined;

  // Picking "Add new" must not leave that option shown: an empty field passes value={undefined},
  // which Ant Design treats as uncontrolled, so remount the select to drop its internal pick.
  const [addNewResetKey, setAddNewResetKey] = useState(0);
  const onSelect =
    sentinel && onAddNew && !addNewAsLink
      ? (/** @type {unknown} */ value) => {
          if (value !== sentinel) return;
          setAddNewResetKey((k) => k + 1);
          onAddNew();
        }
      : undefined;

  const treeSelect = (
    <TreeSelect
      key={addNewResetKey}
      allowClear={allowClear}
      showSearch={showSearch}
      treeNodeFilterProp="title"
      loading={loading}
      placeholder={placeholder}
      treeData={mergedTreeData}
      treeDefaultExpandAll={treeDefaultExpandAll}
      onSelect={onSelect}
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
        {treeSelect}
      </LookupFieldWithAddFooter>
    </Form.Item>
  );
}
