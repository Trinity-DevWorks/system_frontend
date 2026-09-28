"use client";

import AuthSplitShell from "@/features/auth/components/AuthSplitShell";
import InvoiceProofAttestationsPanel from "@/features/sales-invoices/components/InvoiceProofVerify/InvoiceProofAttestationsPanel";
import { readOnChainContentHash, verifyDisclosureBundle } from "@/lib/invoice-proof-merkle";
import { resolveHostMode } from "@/lib/runtime-mode";
import { App, Alert, Button, Descriptions, Tag, Typography, Upload } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * @param {unknown} value
 */
function formatLeafValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "[]";
  return String(value);
}

/**
 * @param {{ initialHost: string }} props
 */
function InvoiceProofDisclosureVerifyInner({ initialHost }) {
  const t = useTranslations("InvoiceProofDisclosure");
  const { message } = App.useApp();
  const [bundle, setBundle] = useState(/** @type {import("@/lib/invoice-proof-merkle").InvoiceProofDisclosureBundle | null} */ (null));
  const [result, setResult] = useState(/** @type {ReturnType<typeof verifyDisclosureBundle> | null} */ (null));
  const [chainState, setChainState] = useState(/** @type {"idle" | "checking" | "match" | "mismatch" | "missing"} */ ("idle"));

  const mode = resolveHostMode(initialHost);
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  /**
   * @param {File} file
   */
  const handleFile = async (file) => {
    setChainState("idle");
    try {
      const parsed = JSON.parse(await file.text());
      setResult(verifyDisclosureBundle(parsed));
      setBundle(parsed);
    } catch {
      setBundle(null);
      setResult(null);
      message.error(t("verifyInvalidFile"));
    }
    return false;
  };

  const handleChainCheck = async () => {
    if (!bundle || !result) return;
    setChainState("checking");
    try {
      const onChain = await readOnChainContentHash({
        chainId: Number(bundle.chain_id),
        contractAddress: String(bundle.contract_address ?? ""),
        proofId: String(bundle.proof_id ?? ""),
      });
      if (onChain === null) setChainState("missing");
      else setChainState(onChain === result.contentHash ? "match" : "mismatch");
    } catch (err) {
      setChainState("idle");
      const code = err instanceof Error ? err.message : "";
      if (code === "missing_wallet") message.error(t("verifyWalletMissing"));
      else if (code === "wrong_network") message.error(t("verifyWrongNetwork"));
      else message.error(t("verifyChainError"));
    }
  };

  const chainReady = Boolean(bundle?.chain_id && bundle?.contract_address && bundle?.proof_id);

  return (
    <AuthSplitShell isCentral={mode.isCentral} tenantLabel={tenantLabel} scrollable documentLayout>
      <div className="mb-6">
        <Typography.Title level={3} className="!mb-1 !mt-0">
          {t("verifyTitle")}
        </Typography.Title>
        <Typography.Paragraph className="!mb-0 !text-sm !text-[var(--ant-color-text-secondary)]">
          {t("verifySubtitle")}
        </Typography.Paragraph>
      </div>

      <Upload.Dragger accept=".json,application/json" multiple={false} showUploadList={false} beforeUpload={handleFile}>
        <p className="m-0 py-4">{t("verifyDrop")}</p>
      </Upload.Dragger>

      {result && bundle ? (
        <div className="mt-6 flex flex-col gap-4">
          <Alert
            type={result.valid ? "success" : "error"}
            showIcon
            title={result.valid ? t("verifyFieldsValid") : t("verifyFieldsInvalid")}
          />

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label={t("verifyProofId")}>
              <span className="font-mono text-xs" dir="ltr">{bundle.proof_id}</span>
            </Descriptions.Item>
            <Descriptions.Item label={t("verifyContentHash")}>
              <span className="break-all font-mono text-xs" dir="ltr">{result.contentHash}</span>
            </Descriptions.Item>
            {bundle.tx_hash ? (
              <Descriptions.Item label={t("verifyTxHash")}>
                <span className="break-all font-mono text-xs" dir="ltr">{bundle.tx_hash}</span>
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label={t("verifyDisclosed")}>
              {t("verifyDisclosedCount", { count: result.fields.length, total: Number(bundle.leaf_count ?? 0) })}
            </Descriptions.Item>
          </Descriptions>

          <div className="flex flex-col gap-2">
            {result.fields.map((field) => (
              <div
                key={field.path}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ant-color-border-secondary)] px-3 py-2"
              >
                <span dir="ltr">
                  <span className="font-mono text-xs">{field.path}</span>
                  <span className="ms-2">{formatLeafValue(field.value)}</span>
                </span>
                <Tag color={field.ok ? "green" : "red"}>{field.ok ? t("verifyFieldOk") : t("verifyFieldBad")}</Tag>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Typography.Text type="secondary" className="text-sm">
              {chainReady ? t("verifyChainHint") : t("verifyNoChain")}
            </Typography.Text>
            <Button
              type="primary"
              disabled={!chainReady || !result.valid}
              loading={chainState === "checking"}
              onClick={handleChainCheck}
            >
              {t("verifyChainAction")}
            </Button>
          </div>

          {chainState === "match" ? <Alert type="success" showIcon title={t("verifyChainMatch")} /> : null}
          {chainState === "match" ? (
            <InvoiceProofAttestationsPanel
              chainId={Number(bundle.chain_id)}
              contractAddress={String(bundle.contract_address ?? "")}
              proofId={String(bundle.proof_id ?? "")}
              contentHash={result.contentHash}
            />
          ) : null}
          {chainState === "mismatch" ? <Alert type="error" showIcon title={t("verifyChainMismatch")} /> : null}
          {chainState === "missing" ? <Alert type="warning" showIcon title={t("verifyChainMissing")} /> : null}
        </div>
      ) : null}
    </AuthSplitShell>
  );
}

/**
 * Public page: verifies a selective-disclosure file in the browser and against InvoiceRegistry.
 * @param {{ initialHost: string }} props
 */
export default function InvoiceProofDisclosureVerifyPage({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <InvoiceProofDisclosureVerifyInner initialHost={initialHost} />
    </App>
  );
}
