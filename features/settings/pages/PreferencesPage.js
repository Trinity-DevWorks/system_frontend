"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * User notification preferences page (Settings → User → Preferences).
 *
 * What: Per-type In-app / Email toggles backed by the notifications preferences API.
 * Used for: /main/settings/preferences.
 * Solves: Lets each user control which Phase 1 channels deliver each notification type.
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { NOTIFICATIONS_QUERY_KEY, fetchNotificationPreferences, updateNotificationPreferences } from "@/features/notifications";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Space, Spin, Switch, Tag, Typography, theme } from "antd";
import { getNotificationTypeMessage } from "@/shell/header/notificationFormat";
import { useMessages, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

const CHANNELS = /** @type {const} */ (["database", "mail"]);

/** @typedef {{ type: string, channel: string, enabled: boolean, default?: boolean }} PreferenceRow */

/**
 * Stable display groups for the preferences matrix.
 * @type {Array<{ id: string, types: string[] }>}
 */
const PREFERENCE_GROUPS = [
  {
    id: "account",
    types: [
      "user.created",
      "user.role_assigned",
      "user.deactivated",
      "branch.user_assigned",
    ],
  },
  {
    id: "purchasing",
    types: [
      "purchasing.low_stock",
      "purchasing.low_stock_item",
      "purchase_order.confirmed",
      "purchase_order.sent",
      "purchase_order.cancelled",
      "purchase_order.closed",
      "goods_receipt.posted",
    ],
  },
  {
    id: "stock",
    types: [
      "stock_transfer.dispatched",
      "stock_transfer.received",
      "stock_transfer.cancelled",
      "stock.lot_expiry",
      "stock.lot_expiry_item",
      "stock_movement.posted",
    ],
  },
];

/**
 * @param {PreferenceRow[]} rows
 * @returns {Map<string, boolean>}
 */
function rowsToMap(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(`${row.type}|${row.channel}`, Boolean(row.enabled));
  }
  return map;
}

/**
 * @param {Map<string, boolean>} map
 * @returns {PreferenceRow[]}
 */
function mapToPayload(map) {
  /** @type {PreferenceRow[]} */
  const out = [];
  for (const [key, enabled] of map.entries()) {
    const [type, channel] = key.split("|");
    if (!type || !channel) continue;
    out.push({ type, channel, enabled });
  }
  return out;
}

/**
 * @param {Map<string, boolean>} a
 * @param {Map<string, boolean>} b
 */
function mapsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a.entries()) {
    if (b.get(key) !== value) return false;
  }
  return true;
}

/**
 * @param {Map<string, boolean>} map
 * @param {string} channel
 */
function countEnabledForChannel(map, channel) {
  const suffix = `|${channel}`;
  let count = 0;
  for (const [key, enabled] of map.entries()) {
    if (enabled && key.endsWith(suffix)) count += 1;
  }
  return count;
}

export default function PreferencesPage() {
  const t = useTranslations("NotificationPreferences");
  const tApiErrors = useTranslations("ApiErrors");
  const messages = useMessages();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const queryKey = [...NOTIFICATIONS_QUERY_KEY, "preferences"];

  const prefsQuery = useQuery({
    queryKey,
    queryFn: fetchNotificationPreferences,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(/** @type {Map<string, boolean> | null} */ (null));

  const serverMap = useMemo(
    () => rowsToMap(Array.isArray(prefsQuery.data) ? prefsQuery.data : []),
    [prefsQuery.data],
  );

  const isDirty =
    isEditing && draft !== null && !mapsEqual(draft, serverMap);

  const saveMutation = useMutation({
    mutationFn: () => updateNotificationPreferences(mapToPayload(draft ?? new Map())),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setDraft(null);
      setIsEditing(false);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"),
      );
    },
  });

  const startEditing = useCallback(() => {
    setDraft(new Map(serverMap));
    setIsEditing(true);
  }, [serverMap]);

  const cancelEditing = useCallback(() => {
    setDraft(null);
    setIsEditing(false);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(new Map(serverMap));
  }, [serverMap]);

  /**
   * @param {string} type
   * @param {string} channel
   * @param {boolean} enabled
   */
  const setToggle = (type, channel, enabled) => {
    if (!isEditing) return;
    setDraft((prev) => {
      const next = new Map(prev ?? serverMap);
      next.set(`${type}|${channel}`, enabled);
      return next;
    });
  };

  /**
   * @param {string} type
   * @param {string} channel
   */
  const isEnabled = (type, channel) => {
    const key = `${type}|${channel}`;
    if (draft?.has(key)) return Boolean(draft.get(key));
    return Boolean(serverMap.get(key));
  };

  /**
   * Preference row label. Prefer `types.{type}.label` when present so
   * interpolated inbox titles (e.g. "Low stock in {warehouse_name}") are
   * not rendered without params.
   *
   * @param {string} type
   */
  const typeTitle = (type) =>
    getNotificationTypeMessage(messages, type, "label") ||
    getNotificationTypeMessage(messages, type, "title") ||
    type;

  if (prefsQuery.isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (prefsQuery.isError) {
    return <Alert type="error" showIcon title={t("loadError")} />;
  }

  const inAppCount = countEnabledForChannel(serverMap, "database");
  const emailCount = countEnabledForChannel(serverMap, "mail");
  const actions = !isEditing ? (
    <Button type="default" icon={<EditOutlined />} onClick={startEditing}>
      {t("edit")}
    </Button>
  ) : (
    <Space wrap>
      <Button onClick={cancelEditing} disabled={saveMutation.isPending}>
        {t("cancel")}
      </Button>
      <Button
        onClick={resetDraft}
        disabled={!isDirty || saveMutation.isPending}
      >
        {t("reset")}
      </Button>
      <Button
        type={isDirty ? "primary" : "default"}
        disabled={!isDirty}
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {t("save")}
      </Button>
    </Space>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pt-1">
            <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
              {t("title")}
            </Typography.Title>
            <Typography.Text type="secondary" className="block max-w-full">
              {t("subtitle")}
            </Typography.Text>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Tag className="!m-0">
                {t("channelInApp")} · {inAppCount}
              </Tag>
              <Tag className="!m-0">
                {t("channelEmail")} · {emailCount}
              </Tag>
            </div>
          </div>
          <div className="shrink-0">{actions}</div>
        </div>
      </Card>

      <div
        className="hidden grid-cols-[minmax(0,1fr)_88px_88px] gap-3 px-4 text-xs font-semibold uppercase tracking-wide md:grid"
        style={{ color: token.colorTextSecondary }}
      >
        <span>{t("columnType")}</span>
        <span className="text-center">{t("channelInApp")}</span>
        <span className="text-center">{t("channelEmail")}</span>
      </div>

      {PREFERENCE_GROUPS.map((group) => (
        <Card
          key={group.id}
          title={t(`groups.${group.id}`)}
          styles={{
            header: { borderBottomColor: token.colorSplit },
            body: { padding: 0 },
          }}
        >
          <ul className="m-0 list-none p-0">
            {group.types.map((type, index) => (
              <li
                key={type}
                className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_88px_88px] md:items-center"
                style={{
                  borderTop:
                    index === 0 ? "none" : `1px solid ${token.colorSplit}`,
                }}
              >
                <div className="min-w-0">
                  <div
                    className="text-sm font-medium leading-5"
                    style={{ color: token.colorText }}
                  >
                    {typeTitle(type)}
                  </div>
                </div>

                {CHANNELS.map((channel) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between gap-2 md:justify-center"
                  >
                    <span
                      className="text-xs md:hidden"
                      style={{ color: token.colorTextSecondary }}
                    >
                      {channel === "database"
                        ? t("channelInApp")
                        : t("channelEmail")}
                    </span>
                    <Switch
                      size="small"
                      disabled={!isEditing}
                      checked={isEnabled(type, channel)}
                      onChange={(checked) => setToggle(type, channel, checked)}
                      aria-label={`${typeTitle(type)} — ${
                        channel === "database"
                          ? t("channelInApp")
                          : t("channelEmail")
                      }`}
                    />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
