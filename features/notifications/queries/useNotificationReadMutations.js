"use client";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
  restoreNotificationInboxCache,
  snapshotNotificationInboxCache,
} from "./notificationQueryCache";
import { NOTIFICATIONS_QUERY_KEY } from "./notificationsQueryKeys";

/**
 * Mark-one / mark-all with inbox cache updates in onMutate and rollback on error.
 */
export function useNotificationReadMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = snapshotNotificationInboxCache(queryClient);
      markNotificationReadInCache(queryClient, id);
      return { previous };
    },
    onError: (_err, _id, context) => {
      restoreNotificationInboxCache(queryClient, context?.previous);
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = snapshotNotificationInboxCache(queryClient);
      markAllNotificationsReadInCache(queryClient);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      restoreNotificationInboxCache(queryClient, context?.previous);
    },
  });

  return { markReadMutation, markAllMutation };
}
