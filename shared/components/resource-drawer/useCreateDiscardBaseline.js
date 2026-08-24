"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Deep-clone form values for a discard baseline (handles nested objects, arrays, dayjs-like).
 * @param {unknown} value
 * @returns {unknown}
 */
export function cloneFormValuesSnapshot(value) {
  if (value === null || typeof value !== "object") return value;
  if (typeof value.format === "function" && typeof value.isValid === "function") {
    try {
      return value.isValid() ? value.format("YYYY-MM-DD") : value;
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map((x) => cloneFormValuesSnapshot(x));
  const out = /** @type {Record<string, unknown>} */ ({});
  for (const k of Object.keys(value)) {
    out[k] = cloneFormValuesSnapshot(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * After "Save" (keep editing), the form still differs from initial empty defaults — treat current
 * values as the new clean baseline so closing does not show a false discard warning.
 *
 * @template {Record<string, unknown>} T
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   form: import("antd").FormInstance;
 *   defaults: T;
 *   isCreateDirtyVsBaseline: (form: import("antd").FormInstance, baseline: T) => boolean;
 * }} args
 */
export function useCreateDiscardBaseline({ open, mode, form, defaults, isCreateDirtyVsBaseline }) {
  /** @type {import("react").MutableRefObject<T>} */
  const baselineRef = useRef(/** @type {T} */ (cloneFormValuesSnapshot(defaults)));

  useEffect(() => {
    if (!open || mode !== "create") return;
    baselineRef.current = /** @type {T} */ (cloneFormValuesSnapshot(defaults));
  }, [open, mode, defaults]);

  const syncBaselineFromFormFields = useCallback(() => {
    baselineRef.current = /** @type {T} */ (cloneFormValuesSnapshot(form.getFieldsValue(true)));
  }, [form]);

  const resetBaselineToDefaults = useCallback(() => {
    baselineRef.current = /** @type {T} */ (cloneFormValuesSnapshot(defaults));
  }, [defaults]);

  const isCreateDirty = useCallback(
    () => isCreateDirtyVsBaseline(form, baselineRef.current),
    [form, isCreateDirtyVsBaseline],
  );

  return { syncBaselineFromFormFields, resetBaselineToDefaults, isCreateDirty };
}
