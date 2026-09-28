"use client";

import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { Select } from "antd";
import { useEffect, useMemo, useRef } from "react";
import {
  itemLineUomSelectFilter,
  isItemLineUomSentinel,
  preferredItemLineUomOption,
} from "../utils/itemLineUomOptions";
import { usePurchaseOrderLineUomOptions } from "../queries/usePurchaseOrderDrawerData";

/**
 * Unit select for stock document lines — only UOMs of the selected item; base marked.
 *
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   prefer?: "base" | "sale" | "purchase";
 *   placeholder?: string;
 *   onChange: (value: number | string, option?: import("../utils/itemLineUomOptions").ItemLineUomOption) => void;
 * }} props
 */
export default function StockLineUomField({
  itemId,
  value,
  readOnly,
  t,
  prefer = "base",
  placeholder,
  onChange,
}) {
  const { options, pending } = usePurchaseOrderLineUomOptions({
    itemId,
    t,
    enabled: Boolean(itemId) && isPersistedEntityId(itemId),
  });
  const appliedItemRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    if (itemId == null) {
      appliedItemRef.current = null;
      return;
    }
    if (readOnly || pending || appliedItemRef.current === itemId) return;
    const preferred = preferredItemLineUomOption(options, prefer);
    appliedItemRef.current = itemId;
    if (preferred && isItemLineUomSentinel(value)) {
      onChange(preferred.value, preferred);
    }
  }, [itemId, pending, readOnly, options, prefer, value, onChange]);

  const selectValue = useMemo(() => {
    if (!isItemLineUomSentinel(value)) return value;
    return preferredItemLineUomOption(options, prefer)?.value;
  }, [options, prefer, value]);

  return (
    <Select
      showSearch
      filterOption={itemLineUomSelectFilter}
      className="w-full"
      placeholder={placeholder ?? t("lineUomPlaceholder")}
      value={selectValue}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={(next) => {
        const matched = options.find(
          (row) => row.value === next || String(row.value) === String(next),
        );
        onChange(next, matched);
      }}
    />
  );
}
