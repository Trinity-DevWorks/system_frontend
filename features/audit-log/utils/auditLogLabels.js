/**
 * Audit event + auditable type labels for Audit Log UI.
 */

/** @type {readonly string[]} */
export const AUDIT_EVENT_VALUES = Object.freeze([
  "created",
  "updated",
  "deleted",
  "restored",
  "login",
  "login_failed",
  "logout",
  "password_reset",
  "download",
  "export",
]);

/** Common morph aliases from backend Relation::enforceMorphMap (subset for filters). */
/** @type {readonly string[]} */
export const AUDIT_AUDITABLE_TYPE_VALUES = Object.freeze([
  "user",
  "role",
  "permission",
  "company_profile",
  "tenant_setting",
  "attachment",
  "brand",
  "category",
  "vat_group",
  "currency",
  "payment_method",
  "payment_term",
  "warehouse",
  "salesman",
  "customer",
  "customer_group",
  "supplier",
  "supplier_group",
  "item",
  "unit_group",
  "unit_of_measurement",
  "stock_transfer",
  "purchase_order",
  "purchase_order_line",
  "goods_receipt",
  "goods_receipt_line",
  "opening_stock",
  "opening_stock_line",
  "stock_adjustment",
  "stock_adjustment_line",
  "stock_adjustment_reason",
  "production",
  "production_line",
  "bundle_explosion",
  "bundle_explosion_line",
  "stock_count",
  "stock_count_line",
  "tenant",
]);

/**
 * @param {(key: string, values?: Record<string, string>) => string} t
 * @param {string | null | undefined} event
 */
export function getAuditEventLabel(t, event) {
  if (!event) return "\u2014";
  if (AUDIT_EVENT_VALUES.includes(event)) {
    return t(`event_${event}`);
  }
  return String(event);
}

/**
 * @param {(key: string, values?: Record<string, string>) => string} t
 * @param {string | null | undefined} type
 */
export function getAuditableTypeLabel(t, type) {
  if (!type) return "\u2014";
  if (AUDIT_AUDITABLE_TYPE_VALUES.includes(type)) {
    return t(`auditable_${type}`);
  }
  return String(type);
}
