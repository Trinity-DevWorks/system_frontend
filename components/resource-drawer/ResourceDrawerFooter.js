"use client";

import { DownOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space } from "antd";

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
 *   handleEditSubmit: () => void;
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
  canSubmitRequired,
  fetchRemoteDetail,
  detailEnabled,
  detailQueryError,
}) {
  if (readOnly) {
    return (
      <div className="flex justify-end">
        <Button onClick={forceClose}>{t("drawerClose")}</Button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Space.Compact className="rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/15">
          <Button
            type="primary"
            loading={submitting}
            disabled={createSaveDisabled}
            onClick={() => runCreate(lastCreateIntent)}
          >
            {createIntentLabel(lastCreateIntent)}
          </Button>
          <Dropdown
            trigger={["click"]}
            disabled={createSaveDisabled}
            menu={{
              items: createSaveMenuItems,
              onClick: ({ key }) => runCreate(/** @type {DrawerSaveIntent} */ (key)),
            }}
          >
            <Button
              type="primary"
              icon={<DownOutlined />}
              loading={submitting}
              disabled={createSaveDisabled}
              aria-label={t("drawerSaveActionsMenu")}
            />
          </Dropdown>
        </Space.Compact>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button onClick={requestClose} disabled={submitting}>
        {t("drawerCancel")}
      </Button>
      <Button
        type="primary"
        onClick={handleEditSubmit}
        loading={submitting}
        disabled={!canSubmitRequired || (fetchRemoteDetail && detailEnabled && detailQueryError)}
      >
        {t("drawerSaveUpdate")}
      </Button>
    </div>
  );
}
