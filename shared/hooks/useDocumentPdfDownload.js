"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useMutation } from "@tanstack/react-query";
import { App } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * Shared PDF download / print mutations for drawers and row menus.
 * Passes the current UI locale and reports failures with localized API errors.
 *
 * @param {{
 *   download: (id: string, documentNumber: string | undefined, options: { locale?: string }) => Promise<void>;
 *   print?: (id: string, documentNumber: string | undefined, options: { locale?: string }) => Promise<void>;
 *   errorTitle: string;
 * }} params
 */
export function useDocumentPdfDownload({ download, print, errorTitle }) {
  const locale = useLocale();
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();

  const onError = useCallback(
    (err) => {
      notification.error({
        title: errorTitle,
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    [errorTitle, notification, tApiErrors],
  );

  const downloadMutation = useMutation({
    mutationFn: (/** @type {{ id: string; number?: string | null }} */ vars) =>
      download(vars.id, typeof vars.number === "string" ? vars.number : undefined, { locale }),
    onError,
  });

  const printMutation = useMutation({
    mutationFn: (/** @type {{ id: string; number?: string | null }} */ vars) => {
      const run = print ?? download;
      return run(vars.id, typeof vars.number === "string" ? vars.number : undefined, {
        locale,
        mode: "print",
      });
    },
    onError,
  });

  const downloadPdf = useCallback(
    (/** @type {string | number | null | undefined} */ id, /** @type {unknown} */ number) => {
      if (id == null || id === "") return;
      downloadMutation.mutate({ id: String(id), number: typeof number === "string" ? number : undefined });
    },
    [downloadMutation],
  );

  const printPdf = useCallback(
    (/** @type {string | number | null | undefined} */ id, /** @type {unknown} */ number) => {
      if (id == null || id === "") return;
      printMutation.mutate({ id: String(id), number: typeof number === "string" ? number : undefined });
    },
    [printMutation],
  );

  return {
    downloadPdf,
    printPdf,
    isPending: downloadMutation.isPending || printMutation.isPending,
    isPrintPending: printMutation.isPending,
    isDownloadPending: downloadMutation.isPending,
  };
}
