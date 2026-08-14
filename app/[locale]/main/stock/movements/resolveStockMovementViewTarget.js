import { normalizeEntityId } from "@/lib/entityId";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isUuidLikeEntityId(value) {
  const id = normalizeEntityId(value);
  return id != null && UUID_RE.test(id);
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @returns {{ kind: "transfer"; transferId: string } | { kind: "movement"; movementId: string } | null}
 */
export function resolveStockMovementViewTarget(record) {
  if (!record || typeof record !== "object") return null;

  const type = typeof record.type === "string" ? record.type : "";
  if (type === "transfer_in" || type === "transfer_out") {
    const transferId = normalizeEntityId(record.reference_id);
    if (transferId == null) return null;
    return { kind: "transfer", transferId };
  }

  const movementId = normalizeEntityId(record.id);
  if (movementId == null) return null;
  return { kind: "movement", movementId };
}
