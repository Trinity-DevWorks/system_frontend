"use client";

import { fetchWalletInspection } from "@/lib/api/walletInspection";
import { QUERY_GC_TIME } from "@/lib/queryStaleTime";
import { WALLET_ADDRESS_PATTERN } from "@/lib/wallet-address";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Segmented, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export const WALLET_TYPES = /** @type {const} */ (["wallet", "safe"]);

/**
 * @param {string} address
 */
function shortAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * @param {{
 *   kind: "wallet" | "safe" | "contract" | null;
 *   owners: string[];
 *   threshold: number | null;
 *   blockchain_network: string | null;
 * }} inspection
 * @param {"wallet" | "safe"} type
 * @param {(key: string, values?: Record<string, unknown>) => string} t
 * @param {(type: "wallet" | "safe") => void} onSwitch
 */
function InspectionPreview({ inspection, type, t, onSwitch }) {
  const network = inspection.blockchain_network === "sepolia" ? t("networkSepolia") : t("networkAnvil");
  const { kind, owners, threshold } = inspection;

  if (kind === type && kind === "wallet") {
    return <Typography.Text type="success">{t("foundWallet", { network })}</Typography.Text>;
  }
  if (kind === type && kind === "safe") {
    return (
      <div>
        <Typography.Text type="success">
          {t("foundSafe", { threshold: threshold ?? 1, count: owners.length, network })}
        </Typography.Text>
        <ul className="mt-1 mb-0 list-none p-0">
          {owners.map((owner) => (
            <li key={owner} className="font-mono text-xs" dir="ltr" title={owner}>
              {shortAddress(owner)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const message =
    kind === "safe"
      ? t("mismatchIsSafe", { network })
      : kind === "wallet"
        ? t("mismatchIsWallet", { network })
        : t("mismatchIsContract", { network });
  const switchTo = kind === "safe" ? "safe" : kind === "wallet" ? "wallet" : null;

  return (
    <Alert
      type="warning"
      showIcon
      className="mt-1"
      title={message}
      action={
        switchTo ? (
          <Button size="small" onClick={() => onSwitch(switchTo)}>
            {switchTo === "safe" ? t("switchToSafe") : t("switchToWallet")}
          </Button>
        ) : null
      }
    />
  );
}

/**
 * Wallet type picker (personal wallet or Safe), address input, and a live
 * on-chain preview. The backend re-checks the declared type on save.
 *
 * @param {{
 *   addressName: string;
 *   typeName: string;
 *   label: import("react").ReactNode;
 *   extra?: import("react").ReactNode;
 *   required?: boolean;
 *   requiredMessage?: string;
 *   invalidMessage: string;
 *   inspect?: boolean;
 *   allowClear?: boolean;
 * }} props
 */
export default function WalletAddressField({
  addressName,
  typeName,
  label,
  extra,
  required = false,
  requiredMessage,
  invalidMessage,
  inspect = true,
  allowClear = false,
}) {
  const t = useTranslations("WalletAddressField");
  const form = Form.useFormInstance();
  const rawAddress = Form.useWatch(addressName, form);
  const rawType = Form.useWatch(typeName, form);
  const type = rawType === "safe" ? "safe" : "wallet";
  const address = typeof rawAddress === "string" ? rawAddress.trim() : "";
  const [debounced, setDebounced] = useState(address);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(address), 400);
    return () => window.clearTimeout(timer);
  }, [address]);

  const canInspect = inspect && Boolean(hostname) && WALLET_ADDRESS_PATTERN.test(debounced);
  const inspection = useQuery({
    queryKey: ["tenant", hostname, "wallet-inspection", debounced.toLowerCase()],
    queryFn: () => fetchWalletInspection(debounced),
    enabled: canInspect,
    staleTime: 30_000,
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const onSwitch = (next) => form.setFieldValue(typeName, next);

  let preview = null;
  if (canInspect && debounced === address) {
    if (inspection.isPending) {
      preview = (
        <span className="inline-flex items-center gap-2">
          <Spin size="small" />
          {t("checking")}
        </span>
      );
    } else if (inspection.isError) {
      preview = <Typography.Text type="warning">{t("checkFailed")}</Typography.Text>;
    } else if (inspection.data?.available && inspection.data.kind) {
      preview = <InspectionPreview inspection={inspection.data} type={type} t={t} onSwitch={onSwitch} />;
    }
  }

  return (
    <>
      <Form.Item name={typeName} label={label} className="!mb-2">
        <Segmented
          options={WALLET_TYPES.map((value) => ({
            value,
            label: value === "safe" ? t("typeSafe") : t("typeWallet"),
          }))}
        />
      </Form.Item>
      <Form.Item
        name={addressName}
        extra={
          extra || preview ? (
            <div className="flex flex-col gap-1">
              {extra ? <span>{extra}</span> : null}
              {preview}
            </div>
          ) : undefined
        }
        rules={[
          ...(required ? [{ required: true, message: requiredMessage ?? invalidMessage }] : []),
          {
            validator: async (_, value) => {
              const trimmed = typeof value === "string" ? value.trim() : "";
              if (trimmed === "" || WALLET_ADDRESS_PATTERN.test(trimmed)) return;
              throw new Error(invalidMessage);
            },
          },
        ]}
      >
        <Input
          autoComplete="off"
          placeholder={type === "safe" ? t("placeholderSafe") : t("placeholderWallet")}
          className="font-mono"
          dir="ltr"
          allowClear={allowClear}
        />
      </Form.Item>
    </>
  );
}
