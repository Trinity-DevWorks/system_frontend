"use client";

import { tenantRequest } from "@/lib/axios";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Form, Input, Space } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * PLU input for scale items: "Suggest" fills the next free PLU; a warning shows when the PLU is too
 * long for an active label format or another scale item already uses it.
 *
 * @param {{ form: import("antd").FormInstance; readOnly: boolean; scaleItem: boolean; itemId?: string | number | null; t: (key: string, values?: Record<string, unknown>) => string; placeholder: string }} props
 */
export default function ScalePluField({ form, readOnly, scaleItem, itemId, t, placeholder, ...rest }) {
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const plu = Form.useWatch("plu_code", form);
  const [debounced, setDebounced] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(String(plu ?? "").trim()), 400);
    return () => window.clearTimeout(handle);
  }, [plu]);

  const check = useQuery({
    queryKey: ["tenant", "items", "plu-check", debounced, itemId ?? null],
    queryFn: () =>
      tenantRequest("GET", `items/plu-check?plu=${encodeURIComponent(debounced)}${itemId ? `&item_id=${encodeURIComponent(String(itemId))}` : ""}`),
    enabled: scaleItem && !readOnly && /^\d{1,20}$/.test(debounced),
    staleTime: 30_000,
  });

  const suggest = async () => {
    setSuggesting(true);
    try {
      const next = await tenantRequest("GET", "items/next-plu");
      form.setFieldValue("plu_code", next?.plu ?? "");
      form.validateFields(["plu_code"]).catch(() => {});
    } catch (error) {
      notification.error({ title: t("fieldPluSuggestError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
    } finally {
      setSuggesting(false);
    }
  };

  const result = check.data;
  const tooLong = result && !result.fits ? result.formats ?? [] : [];

  return (
    <>
      {scaleItem && !readOnly ? (
        <Space.Compact className="w-full">
          <Input {...rest} placeholder={placeholder} inputMode="numeric" />
          <Button onClick={suggest} loading={suggesting}>
            {t("fieldPluSuggest")}
          </Button>
        </Space.Compact>
      ) : (
        <Input {...rest} placeholder={placeholder} inputMode={scaleItem ? "numeric" : undefined} />
      )}
      {scaleItem && !readOnly && tooLong.length ? (
        <Alert
          className="!mt-2"
          type="warning"
          showIcon
          title={t("fieldPluTooLong", { formats: tooLong.map((f) => `${f.name} (${f.plu_length})`).join(", ") })}
        />
      ) : null}
      {scaleItem && !readOnly && itemId ? (
        <div className="mt-1 text-xs text-[var(--ant-color-text-tertiary)]">{t("fieldScalePriceReminder")}</div>
      ) : null}
      {scaleItem && !readOnly && result?.taken_by ? (
        <Alert className="!mt-2" type="warning" showIcon title={t("fieldPluTaken", { name: result.taken_by.name })} />
      ) : null}
    </>
  );
}
