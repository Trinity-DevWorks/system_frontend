"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { withConfirmKeyboard } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { deleteInvoiceVerifier, syncInvoiceVerifier } from "../api/invoiceVerifiers.api";
import { INVOICE_VERIFIERS_LIST_QUERY_KEY, invoiceVerifierDetailQueryKey } from "./invoiceVerifiersQueryKeys";

/**
 * Remove is not always an immediate delete: a verifier already on chain turns
 * `removing` until the revoke is mined, so the list is refetched instead of
 * dropping the row locally.
 *
 * @param {{
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 *   message: import("antd").MessageInstance;
 *   modal: import("antd").ModalStaticFunctions;
 *   getOpenRecordId: () => string | number | null;
 *   closeDrawer: () => void;
 * }} args
 */
export function useInvoiceVerifierRowActions({ t, tApiErrors, message, modal, getOpenRecordId, closeDrawer }) {
  const queryClient = useQueryClient();

  const onError = (err) => {
    message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"));
  };

  const settle = (id) => {
    invalidateTenantListQueries(queryClient, INVOICE_VERIFIERS_LIST_QUERY_KEY);
    queryClient.invalidateQueries({ queryKey: invoiceVerifierDetailQueryKey(id) });
  };

  const syncMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => syncInvoiceVerifier(id),
    onSuccess: () => message.success(t("resyncQueued")),
    onError,
    onSettled: (_data, _err, id) => settle(id),
  });

  const removeMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteInvoiceVerifier(id),
    onSuccess: (_data, id) => {
      message.success(t("removeSuccess"));
      const openId = getOpenRecordId();
      if (openId != null && String(openId) === id) closeDrawer();
    },
    onError,
    onSettled: (_data, _err, id) => settle(id),
  });

  const requestResync = useCallback(
    (/** @type {{ id: string }} */ record) => syncMutation.mutate(String(record.id)),
    [syncMutation],
  );

  const requestRemove = useCallback(
    (/** @type {{ id: string; name: string }} */ record) => {
      modal.confirm(
        withConfirmKeyboard({
          title: t("removeConfirmTitle"),
          content: t("removeConfirmContent", { name: record.name }),
          okText: t("remove"),
          cancelText: t("drawerCancel"),
          okButtonProps: { danger: true },
          onOk: () => removeMutation.mutate(String(record.id)),
        }),
      );
    },
    [modal, removeMutation, t],
  );

  return { requestResync, requestRemove };
}
