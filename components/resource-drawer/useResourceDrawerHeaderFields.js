import { Form } from "antd";
import { useMemo } from "react";

/**
 * Resolve drawer header record name and active status from form + loaded row.
 *
 * @param {{
 *   mode: "create" | "edit" | "view";
 *   nameField?: string;
 *   form: import("antd").FormInstance;
 *   detailRow?: Record<string, unknown> | null;
 *   seedRow?: Record<string, unknown> | null;
 *   activeField?: string;
 * }} options
 */
export function useResourceDrawerHeaderFields({
  mode,
  nameField = "name",
  form,
  detailRow = null,
  seedRow = null,
  activeField = "is_active",
}) {
  const nameWatch = Form.useWatch(nameField, form);
  const activeWatch = Form.useWatch(activeField, form);

  const recordName = useMemo(() => {
    if (mode === "create") return null;
    const fromForm = String(nameWatch ?? "").trim();
    if (fromForm) return fromForm;
    const row = detailRow ?? seedRow;
    if (row && typeof row === "object") {
      const n = row[nameField];
      return typeof n === "string" ? n.trim() : "";
    }
    return "";
  }, [mode, nameWatch, detailRow, seedRow, nameField]);

  const statusActive = useMemo(() => {
    if (mode === "create") return null;
    if (activeWatch !== undefined) return activeWatch !== false;
    const row = detailRow ?? seedRow;
    if (row && typeof row === "object" && activeField in row) {
      return /** @type {{ [k: string]: boolean }} */ (row)[activeField] !== false;
    }
    return true;
  }, [mode, activeWatch, detailRow, seedRow, activeField]);

  return { recordName, statusActive };
}
