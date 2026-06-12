/**
 * Drawer footer — cancel, save, and create/edit save-intent actions (general tab vs other tabs).
 *
 * Used by:
 * - drawer/ItemDrawer.js (via useItemDrawerController footerProps)
 */

import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";

/**
 * @param {{
 *   isGeneralTab: boolean;
 *   mode: "create" | "edit" | "view";
 *   readOnly: boolean;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   canSubmitRequired: boolean;
 *   fetchRemoteDetail: boolean;
 *   detailEnabled: boolean;
 *   detailQueryError: boolean;
 *   lastCreateIntent: "keep" | "new" | "close" | null;
 *   runCreate: (intent: "keep" | "new" | "close") => void;
 *   createIntentLabel: (intent: "keep" | "new" | "close") => string;
 *   createSaveMenuItems: { key: "keep" | "new" | "close"; label: string }[];
 *   handleEditSubmit?: () => void;
 *   editSaveDisabled: boolean;
 * }} props
 */
export default function ItemDrawerFooter({
  isGeneralTab,
  mode,
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  canSubmitRequired,
  fetchRemoteDetail,
  detailEnabled,
  detailQueryError,
  lastCreateIntent,
  runCreate,
  createIntentLabel,
  createSaveMenuItems,
  handleEditSubmit,
  editSaveDisabled,
}) {
  if (isGeneralTab) {
    return (
      <ResourceDrawerFooter
        mode={mode}
        readOnly={readOnly}
        t={t}
        forceClose={forceClose}
        requestClose={requestClose}
        submitting={submitting}
        createSaveDisabled={!canSubmitRequired || submitting || (fetchRemoteDetail && detailEnabled && detailQueryError)}
        lastCreateIntent={lastCreateIntent}
        runCreate={runCreate}
        createIntentLabel={createIntentLabel}
        createSaveMenuItems={createSaveMenuItems}
        handleEditSubmit={mode === "edit" ? handleEditSubmit : undefined}
        editSaveDisabled={editSaveDisabled}
        canSubmitRequired={canSubmitRequired}
        fetchRemoteDetail={fetchRemoteDetail}
        detailEnabled={detailEnabled}
        detailQueryError={detailQueryError}
      />
    );
  }

  return (
    <ResourceDrawerFooter
      mode={mode}
      readOnly
      t={t}
      forceClose={forceClose}
      requestClose={requestClose}
      submitting={false}
      createSaveDisabled
      lastCreateIntent={lastCreateIntent}
      runCreate={runCreate}
      createIntentLabel={createIntentLabel}
      createSaveMenuItems={[]}
      canSubmitRequired={false}
      fetchRemoteDetail={false}
      detailEnabled={false}
      detailQueryError={false}
    />
  );
}
