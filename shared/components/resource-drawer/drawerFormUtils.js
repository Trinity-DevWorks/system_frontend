/** @param {HTMLElement | null | undefined} trigger */
export function drawerSelectGetPopup(trigger) {
  return trigger?.closest?.(".ant-drawer-content") ?? document.body;
}
