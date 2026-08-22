"use client";

/**
 * User notification preferences page (Settings → User → Preferences).
 *
 * What: Per-type In-app / Email toggles backed by the notifications preferences API.
 * Used for: /main/settings/preferences.
 * Solves: Lets each user control which Phase 1 channels deliver each notification type.
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { NOTIFICATIONS_QUERY_KEY, fetchNotificationPreferences, updateNotificationPreferences } from "@/features/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Spin, Switch, Typography, theme } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

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
    ],
  },
  {
    id: "stock",
    types: [
      "stock_transfer.dispatched",
      "stock_transfer.received",
      "stock_transfer.cancelled",
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

export default function PreferencesPage() {
  const t = useTranslations("NotificationPreferences");
  const tNotifications = useTranslations("Notifications");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const queryKey = [...NOTIFICATIONS_QUERY_KEY, "preferences"];

  const prefsQuery = useQuery({
    queryKey,
    queryFn: fetchNotificationPreferences,
    staleTime: 30_000,
  });

  const [draft, setDraft] = useState(/** @type {Map<string, boolean> | null} */ (null));

  const serverMap = useMemo(
    () => rowsToMap(Array.isArray(prefsQuery.data) ? prefsQuery.data : []),
    [prefsQuery.data],
  );

  // `null` draft means "show the server matrix". Edits copy into `draft`;
  // reset and a successful save return to the server snapshot without an effect.
  const isDirty = draft !== null && !mapsEqual(draft, serverMap);

  const saveMutation = useMutation({
    mutationFn: () => updateNotificationPreferences(mapToPayload(draft ?? new Map())),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setDraft(null);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"),
      );
    },
  });

  const resetDraft = () => {
    setDraft(null);
  };

  /**
   * @param {string} type
   * @param {string} channel
   * @param {boolean} enabled
   */
  const setToggle = (type, channel, enabled) => {
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
   * @param {string} type
   */
  const typeTitle = (type) => {
    const key = `types.${type}.title`;
    if (typeof tNotifications.has === "function" && !tNotifications.has(key)) {
      return type;
    }
    return tNotifications(key);
  };

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

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {t("title")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("subtitle")}
          </Typography.Paragraph>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={resetDraft} disabled={!isDirty || saveMutation.isPending}>
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
        </div>
      </div>

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
          size="small"
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
