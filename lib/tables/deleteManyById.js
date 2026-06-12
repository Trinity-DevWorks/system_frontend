/**
 * Delete many records sequentially. Continues after individual failures.
 * @param {(id: string) => Promise<unknown>} deleteOne
 * @param {readonly string[]} ids
 * @returns {Promise<{ successfulIds: string[], failures: { id: string, reason: unknown }[] }>}
 */
export async function deleteManyById(deleteOne, ids) {
  const successfulIds = /** @type {string[]} */ ([]);
  const failures = /** @type {{ id: string, reason: unknown }[]} */ ([]);
  for (const id of ids) {
    try {
      await deleteOne(id);
      successfulIds.push(id);
    } catch (reason) {
      failures.push({ id, reason });
    }
  }
  return { successfulIds, failures };
}
