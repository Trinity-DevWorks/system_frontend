/**
 * Delete many records sequentially. Continues after individual failures.
 * @param {(id: number) => Promise<unknown>} deleteOne
 * @param {readonly number[]} ids
 * @returns {Promise<{ successfulIds: number[], failures: { id: number, reason: unknown }[] }>}
 */
export async function deleteManyById(deleteOne, ids) {
  const successfulIds = /** @type {number[]} */ ([]);
  const failures = /** @type {{ id: number, reason: unknown }[]} */ ([]);
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
