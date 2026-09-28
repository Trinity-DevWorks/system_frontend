"use client";

import { DownOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space } from "antd";
import { useCallback } from "react";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";

/** @typedef {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} DrawerSaveIntent */

/**
 * @param {{
 *   mode: "create" | "edit" | "view";
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   createSaveDisabled: boolean;
 *   lastCreateIntent: DrawerSaveIntent;
 *   runCreate: (intent: DrawerSaveIntent) => void;
 *   createIntentLabel: (intent: DrawerSaveIntent) => string;
 *   createSaveMenuItems: { key: string; label: string }[];
 *   handleEditSubmit?: () => void;
 *   runEdit?: (intent: DrawerSaveIntent) => void;
 *   editSaveDisabled?: boolean;
 *   canSubmitRequired: boolean;
 *   fetchRemoteDetail: boolean;
 *   detailEnabled: boolean;
 *   detailQueryError: boolean;
 * }} props
 */
export default function ResourceDrawerFooter({
  mode,
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  createSaveDisabled,
  lastCreateIntent,
  runCreate,
  createIntentLabel,
  createSaveMenuItems,
  handleEditSubmit,
  runEdit,
  editSaveDisabled = false,
  canSubmitRequired,
  fetchRemoteDetail,
  detailEnabled,
  detailQueryError,
}) {
  const splitSaveMode = mode === "create" || (mode === "edit" && Boolean(runEdit));
  const plainEditMode = mode === "edit" && !runEdit && Boolean(handleEditSubmit);

  const saveDisabled = splitSaveMode
    ? mode === "create"
      ? createSaveDisabled
      : editSaveDisabled || !canSubmitRequired || (fetchRemoteDetail && detailEnabled && detailQueryError)
    : plainEditMode
      ? editSaveDisabled || submitting
      : true;

  const onSaveShortcut = useCallback(() => {
    if (readOnly || saveDisabled || submitting) return;
    if (splitSaveMode) {
      const runSave = mode === "create" ? runCreate : /** @type {(intent: DrawerSaveIntent) => void} */ (runEdit);
      runSave(lastCreateIntent);
      return;
    }
    if (plainEditMode) handleEditSubmit?.();
  }, [
    handleEditSubmit,
    lastCreateIntent,
    mode,
    plainEditMode,
    readOnly,
    runCreate,
    runEdit,
    saveDisabled,
    splitSaveMode,
    submitting,
  ]);

  useDrawerSubmitShortcut({
    enabled: !readOnly && (splitSaveMode || plainEditMode),
    submitting,
    onSave: onSaveShortcut,
    saveDisabled,
  });

  if (readOnly) {
    return (
      <div className="flex justify-start">
        <Button onClick={forceClose}>{t("drawerClose")}</Button>
      </div>
    );
  }

  if (splitSaveMode) {
    const runSave = mode === "create" ? runCreate : /** @type {(intent: DrawerSaveIntent) => void} */ (runEdit);

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Space.Compact className="rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/15">
          <Button
            type="primary"
            loading={submitting}
            disabled={saveDisabled}
            onClick={() => runSave(lastCreateIntent)}
            title={`${createIntentLabel(lastCreateIntent)} (Ctrl+Enter)`}
          >
            {createIntentLabel(lastCreateIntent)}
          </Button>
          <Dropdown
            trigger={["click"]}
            disabled={saveDisabled}
            menu={{
              items: createSaveMenuItems,
              onClick: ({ key }) => runSave(/** @type {DrawerSaveIntent} */ (key)),
            }}
          >
            <Button
              type="primary"
              icon={<DownOutlined />}
              loading={submitting}
              disabled={saveDisabled}
              aria-label={t("drawerSaveActionsMenu")}
            />
          </Dropdown>
        </Space.Compact>
      </div>
    );
  }

  if (plainEditMode) {
    return (
      <div className="flex justify-end gap-2">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Button
          type="primary"
          onClick={handleEditSubmit}
          loading={submitting}
          disabled={editSaveDisabled || submitting}
          title={`${t("drawerSaveUpdate")} (Ctrl+Enter)`}
        >
          {t("drawerSaveUpdate")}
        </Button>
      </div>
    );
  }

  return null;
}
