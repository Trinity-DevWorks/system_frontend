/**
 * Close/discard flow, create/edit save handlers, and create save-menu items.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { Form } from "antd";
import { useCallback, useMemo } from "react";
import { getCreateSaveMenuItems } from "../utils/itemDrawerViewState";
import { isEditDirtyVsLoaded } from "../utils/itemDrawerUtils";

/**
 * @param {{
 *   readOnly: boolean;
 *   mode: "create" | "edit" | "view";
 *   form: import("antd").FormInstance;
 *   isCreateDirty: () => boolean;
 *   editBaselineForDirty: Record<string, unknown> | null;
 *   clearNestedCreate: () => void;
 *   setActiveTab: (tab: string) => void;
 *   onClose: () => void;
 *   modal: import("antd").ModalStaticFunctions;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   createMutation: { mutate: (args: { payload: Record<string, unknown>; intent: "keep" | "new" | "close" }) => void };
 *   updateMutation: { mutate: (args: { id: number; values: Record<string, unknown>; intent: "keep" | "new" | "close" }) => void };
 *   applyPayload: (values: Record<string, unknown>) => Record<string, unknown>;
 *   persistedItemId: number | null;
 *   canSubmitRequired: boolean;
 *   submitting: boolean;
 *   fetchRemoteDetail: boolean;
 *   detailEnabled: boolean;
 *   detailQueryError: boolean;
 *   lastCreateIntent: "keep" | "new" | "close" | null;
 * }} args
 */
export function useItemDrawerActions({
  readOnly,
  mode,
  form,
  isCreateDirty,
  editBaselineForDirty,
  clearNestedCreate,
  setActiveTab,
  onClose,
  modal,
  t,
  createMutation,
  updateMutation,
  applyPayload,
  persistedItemId,
  canSubmitRequired,
  submitting,
  fetchRemoteDetail,
  detailEnabled,
  detailQueryError,
  lastCreateIntent,
}) {
  const formWatch = Form.useWatch([], form);

  const isEditDirty = useMemo(() => {
    void formWatch;
    if (mode !== "edit") return false;
    if (editBaselineForDirty) return isEditDirtyVsLoaded(form, editBaselineForDirty);
    return form.isFieldsTouched(true);
  }, [mode, editBaselineForDirty, form, formWatch]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirty();
    if (mode === "edit" && editBaselineForDirty) return isEditDirtyVsLoaded(form, editBaselineForDirty);
    if (mode === "edit") return form.isFieldsTouched(true);
    return false;
  }, [readOnly, mode, form, isCreateDirty, editBaselineForDirty]);

  const handleDrawerClose = useCallback(() => {
    clearNestedCreate();
    setActiveTab("general");
    onClose();
  }, [clearNestedCreate, setActiveTab, onClose]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose: handleDrawerClose,
    shouldConfirmDiscard,
  });

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => createMutation.mutate({ payload: applyPayload(values), intent }))
        .catch(() => {});
    },
    [form, applyPayload, createMutation],
  );

  const runEdit = useCallback(
    (intent) => {
      if (readOnly || persistedItemId == null) return;
      form
        .validateFields()
        .then((values) =>
          updateMutation.mutate({
            id: persistedItemId,
            values: applyPayload(values),
            intent,
          }),
        )
        .catch(() => {});
    },
    [readOnly, form, applyPayload, persistedItemId, updateMutation],
  );

  const handleEditSubmit = useCallback(() => {
    runEdit("keep");
  }, [runEdit]);

  const editSaveDisabled =
    !canSubmitRequired ||
    submitting ||
    (fetchRemoteDetail && detailEnabled && detailQueryError) ||
    !editBaselineForDirty ||
    !isEditDirty;

  const createIntentLabel = useCallback(
    (intent) => {
      if (intent === "keep") return t("drawerSave");
      if (intent === "new") return t("drawerSaveAndNew");
      return t("drawerSaveAndClose");
    },
    [t],
  );

  const createSaveMenuItems = useMemo(
    () => getCreateSaveMenuItems(lastCreateIntent, createIntentLabel),
    [lastCreateIntent, createIntentLabel],
  );

  return {
    forceClose,
    requestClose,
    runCreate,
    handleEditSubmit,
    editSaveDisabled,
    createIntentLabel,
    createSaveMenuItems,
  };
}
