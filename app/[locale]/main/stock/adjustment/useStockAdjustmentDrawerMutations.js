"use client";

/**
 * Post stock adjustment mutation with field-level API error mapping.
 *
 * Used by:
 * - app/[locale]/main/stock/adjustment/StockAdjustmentDrawer.js
 */

import {
  invalidatePurchasingAlertsQueries,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
} from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { postStockAdjustment } from "@/services/stockApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { stockAdjustmentValuesToPayload } from "./stockAdjustmentDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onPosted?: (movement: unknown) => void;
 * }} args
 */
export function useStockAdjustmentDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  onClose,
  onPosted,
}) {
  const queryClient = useQueryClient();

  const applyPayload = useCallback((values) => stockAdjustmentValuesToPayload(values), []);

  const postMutation = useMutation({
    mutationFn: ({ payload }) => postStockAdjustment(payload),
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("adjustmentError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (data) => {
      message.success(t("adjustmentSuccess"));
      queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
      invalidatePurchasingAlertsQueries(queryClient);
      if (typeof onPosted === "function") {
        onPosted(data);
      } else {
        onClose();
      }
    },
  });

  return {
    applyPayload,
    postMutation,
    submitting: postMutation.isPending,
  };
}
