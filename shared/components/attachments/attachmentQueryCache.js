/**
 * @param {unknown} created
 * @returns {boolean}
 */
export function isAttachmentRow(created) {
  return (
    created != null &&
    typeof created === "object" &&
    "id" in created &&
    typeof /** @type {{ id: unknown }} */ (created).id === "number"
  );
}

/**
 * @param {unknown[]} list
 * @param {Record<string, unknown>} created
 * @returns {unknown[]}
 */
export function appendAttachmentToList(list, created) {
  const id = created.id;
  if (list.some((row) => row?.id === id)) {
    return list.map((row) => (row?.id === id ? { ...row, ...created } : row));
  }
  return [...list, created];
}

/**
 * @param {unknown[]} list
 * @param {number} attachmentId
 * @returns {unknown[]}
 */
export function removeAttachmentFromList(list, attachmentId) {
  return list.filter((row) => row?.id !== attachmentId);
}
