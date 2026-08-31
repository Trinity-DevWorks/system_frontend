/**
 * Ant Design Modal.confirm stays open when `onOk` returns a rejected Promise.
 * Resolve anyway so the dialog closes; mutation `onError` still shows the toast.
 *
 * @param {Promise<unknown>} promise
 * @returns {Promise<void>}
 */
export function closeConfirmOnError(promise) {
  return Promise.resolve(promise).then(
    () => undefined,
    () => undefined,
  );
}
