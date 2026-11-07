"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { normalizeEntityId } from "@/lib/entityId";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createLandedCost, deleteLandedCost, postLandedCost, reverseLandedCost, updateLandedCost } from "../api/landedCosts.api";
import { landedCostPayload } from "../utils/landedCostDrawerUtils";
import { LANDED_COST_SOURCES_QUERY_KEY, LANDED_COSTS_LIST_QUERY_KEY, landedCostDetailQueryKey } from "./landedCostsQueryKeys";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   landedCostId: string | null;
 *   receipts: import("../utils/landedCostDrawerUtils").LandedCostReceipt[];
 *   charges: import("../utils/landedCostDrawerUtils").LandedCostCharge[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onReversed?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 * }} args
 */
export function useLandedCostDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  landedCostId,
  receipts,
  charges,
  onCreated,
  onSaved,
  onPosted,
  onReversed,
  onDeleted,
}) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateTenantListQueries(queryClient, LANDED_COSTS_LIST_QUERY_KEY);
    queryClient.invalidateQueries({ queryKey: LANDED_COST_SOURCES_QUERY_KEY });
  }, [queryClient]);

  const cacheDetail = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id != null) queryClient.setQueryData(landedCostDetailQueryKey(String(id)), record);
    },
    [queryClient],
  );

  const onError = useCallback(
    (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
      }
    },
    [form, notification, t, tApiErrors],
  );

  /** Create or update the draft; returns the saved record. */
  const persist = useCallback(
    async (values) => {
      const body = landedCostPayload(values, receipts, charges);
      const saved = /** @type {Record<string, any>} */ (
        landedCostId != null ? await updateLandedCost(landedCostId, body) : await createLandedCost(body)
      );
      cacheDetail(saved);
      if (landedCostId == null) onCreated?.(saved);
      return saved;
    },
    [landedCostId, receipts, charges, cacheDetail, onCreated],
  );

  const saveMutation = useMutation({
    mutationFn: ({ values }) => persist(values),
    onError,
    onSuccess: (record) => {
      message.success(t("saveSuccess"));
      invalidate();
      onSaved?.(record);
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const saved = await persist(values);
      return postLandedCost(String(saved.id));
    },
    onError,
    onSuccess: (record) => {
      message.success(t("postSuccess"));
      cacheDetail(record);
      invalidate();
      onPosted?.(record);
    },
  });

  const reverseMutation = useMutation({
    mutationFn: () => reverseLandedCost(/** @type {string} */ (landedCostId)),
    onError,
    onSuccess: (record) => {
      message.success(t("reverseSuccess"));
      cacheDetail(record);
      invalidate();
      onReversed?.(record);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLandedCost(/** @type {string} */ (landedCostId)),
    onError,
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      invalidate();
      onDeleted?.();
    },
  });

  const submitting = saveMutation.isPending || postMutation.isPending || reverseMutation.isPending || deleteMutation.isPending;

  return { saveMutation, postMutation, reverseMutation, deleteMutation, submitting };
}
