"use client";

import {
  AttestationError,
  buildAttestationStatement,
  readAttestations,
  readVerifierEligibility,
  referenceHashOf,
  sendAttestation,
  transactionUrl,
} from "@/lib/invoice-registry-attestations";
import { useQuery } from "@tanstack/react-query";
import { App, Alert, Button, Descriptions, Input, Result, Tag, Typography } from "antd";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const ROLE_COLORS = { auditor: "blue", tax_authority: "purple", financier: "gold" };
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

/**
 * @param {unknown} err
 */
function attestationErrorCode(err) {
  return err instanceof AttestationError ? err.code : "failed";
}

/**
 * @param {{ value: string }} props
 */
function Mono({ value }) {
  return (
    <span className="break-all font-mono text-xs" dir="ltr">
      {value}
    </span>
  );
}

/**
 * On-chain attestations for a verified disclosure, plus a guided flow for a listed verifier:
 * connect wallet, eligibility, review the signed statement, then the result.
 * @param {{
 *   chainId: number;
 *   contractAddress: string;
 *   proofId: string;
 *   contentHash: string;
 *   invoiceNumber?: string | null;
 *   onStageChange?: (stage: "wallet" | "review" | "done") => void;
 * }} props
 */
export default function InvoiceProofAttestationsPanel({
  chainId,
  contractAddress,
  proofId,
  contentHash,
  invoiceNumber = null,
  onStageChange,
}) {
  const t = useTranslations("InvoiceProofDisclosure");
  const format = useFormatter();
  const { message } = App.useApp();
  const target = { chainId, contractAddress, proofId };
  const attestationsQuery = useQuery({
    queryKey: ["invoice-proof-attestations", chainId, contractAddress, proofId],
    queryFn: () => readAttestations(target),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const data = attestationsQuery.data ?? null;
  const [verifier, setVerifier] = useState(
    /** @type {Awaited<ReturnType<typeof readVerifierEligibility>> | null} */ (null),
  );
  const [stage, setStage] = useState(/** @type {"wallet" | "review" | "done"} */ ("wallet"));
  const [safeAddress, setSafeAddress] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(/** @type {"connect" | "safe" | "submit" | null} */ (null));
  const [progress, setProgress] = useState(/** @type {"sign" | "send" | "confirm" | null} */ (null));
  const [outcome, setOutcome] = useState(
    /** @type {Awaited<ReturnType<typeof sendAttestation>> | null} */ (null),
  );

  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  // A multi-owner Safe aggregates approvals per exact calldata, so its statement must not
  // depend on which fields each owner's disclosure file reveals.
  const statement = verifier?.role
    ? buildAttestationStatement(verifier.role, verifier.safeAddress ? null : invoiceNumber)
    : "";
  const referenceHash = referenceHashOf(reference);
  const roleLabel = verifier?.role ? t(`attestRoles.${verifier.role}`) : "";

  /**
   * @param {string | null} safe
   */
  const checkEligibility = async (safe) => {
    setBusy(safe ? "safe" : "connect");
    try {
      setVerifier(await readVerifierEligibility(target, { safeAddress: safe }));
    } catch (err) {
      message.error(t(`attestErrors.${attestationErrorCode(err)}`));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    if (!verifier?.role || verifier.blocker) return;
    setBusy("submit");
    try {
      const sent = await sendAttestation({
        ...target,
        contentHash,
        account: verifier.account,
        signer: verifier.signer,
        safeAddress: verifier.safeAddress,
        reference,
        role: verifier.role,
        statement,
        onStage: setProgress,
      });
      setOutcome(sent);
      setStage("done");
      if (sent.status === "executed") await attestationsQuery.refetch();
    } catch (err) {
      message.error(t(`attestErrors.${attestationErrorCode(err)}`));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const resetWallet = () => {
    setVerifier(null);
    setSafeAddress("");
    setStage("wallet");
  };

  const renderEligibility = () => {
    if (!verifier) return null;
    const canTrySafe = verifier.blocker === "not_verifier" && !verifier.safeAddress;

    return (
      <div className="flex flex-col gap-3">
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label={t("attestWallet")}>
            <Mono value={verifier.signer} />
          </Descriptions.Item>
          {verifier.safeAddress ? (
            <Descriptions.Item label={t("attestSafe")}>
              <Mono value={verifier.safeAddress} />
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item label={t("attestRole")}>
            {verifier.role ? (
              <Tag color={ROLE_COLORS[verifier.role]}>{roleLabel}</Tag>
            ) : (
              <Typography.Text type="secondary">{t("attestNotListed")}</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("attestListedBy")}>
            {verifier.supplier ? (
              <Mono value={verifier.supplier} />
            ) : (
              <Typography.Text type="secondary">{t("attestSupplierNotSet")}</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("attestInvoiceStatus")}>{t(`attestStatuses.${verifier.status}`)}</Descriptions.Item>
        </Descriptions>

        {verifier.blocker ? (
          <Alert
            type="warning"
            showIcon
            title={t(`attestErrors.${verifier.blocker}`)}
            description={t(`attestNextSteps.${verifier.blocker}`)}
          />
        ) : (
          <Alert type="success" showIcon title={t("attestEligible", { role: roleLabel })} />
        )}

        {canTrySafe ? (
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--ant-color-border-secondary)] p-3">
            <Typography.Text className="text-sm">{t("attestSafeIntro")}</Typography.Text>
            <Input
              aria-label={t("attestSafeLabel")}
              value={safeAddress}
              placeholder={t("attestSafePlaceholder")}
              dir="ltr"
              onChange={(event) => setSafeAddress(event.target.value)}
            />
            <div className="flex justify-end">
              <Button
                loading={busy === "safe"}
                disabled={safeAddress.trim() === ""}
                onClick={() => checkEligibility(safeAddress)}
              >
                {t("attestCheckSafe")}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={resetWallet}>{verifier.safeAddress ? t("attestUseWallet") : t("attestCheckAgain")}</Button>
          {!verifier.blocker ? (
            <Button type="primary" onClick={() => setStage("review")}>
              {t("attestContinue")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderReview = () => {
    if (!verifier?.role) return null;

    return (
      <div className="flex flex-col gap-3">
        <label className="text-sm" htmlFor="attestation-reference">
          {t("attestReferenceLabel")}
        </label>
        <Input
          id="attestation-reference"
          value={reference}
          maxLength={120}
          placeholder={t("attestReferencePlaceholder")}
          disabled={busy === "submit"}
          onChange={(event) => setReference(event.target.value)}
        />

        <div className="flex flex-col gap-1">
          <Typography.Text strong className="text-sm">
            {t("attestStatementLabel")}
          </Typography.Text>
          <blockquote
            className="m-0 rounded-lg border-s-4 border-[var(--ant-color-primary)] bg-[var(--ant-color-fill-quaternary)] px-3 py-2 text-sm"
            dir="ltr"
          >
            {statement}
          </blockquote>
          <Typography.Text type="secondary" className="text-xs">
            {t("attestStatementHint")}
          </Typography.Text>
        </div>

        <Descriptions size="small" column={1} bordered title={t("attestOnChainTitle")}>
          <Descriptions.Item label={t("verifyProofId")}>
            <Mono value={proofId} />
          </Descriptions.Item>
          <Descriptions.Item label={t("verifyContentHash")}>
            <Mono value={contentHash} />
          </Descriptions.Item>
          <Descriptions.Item label={t("attestRole")}>
            <Tag color={ROLE_COLORS[verifier.role]}>{roleLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("attestReferenceHash")}>
            {referenceHash === ZERO_BYTES32 ? (
              <Typography.Text type="secondary">{t("attestNoReference")}</Typography.Text>
            ) : (
              <Mono value={referenceHash} />
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("attestVerifier")}>
            <Mono value={verifier.account} />
          </Descriptions.Item>
        </Descriptions>

        <Alert type="info" showIcon title={verifier.safeAddress ? t("attestHowSafe") : t("attestHowWallet")} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {progress ? (
            <Typography.Text type="secondary" className="text-sm">
              {t(`attestProgress.${progress}`)}
            </Typography.Text>
          ) : null}
          <Button disabled={busy === "submit"} onClick={() => setStage("wallet")}>
            {t("attestBack")}
          </Button>
          <Button type="primary" loading={busy === "submit"} onClick={handleSubmit}>
            {verifier.safeAddress ? t("attestSubmitSafe") : t("attestSubmit")}
          </Button>
        </div>
      </div>
    );
  };

  const renderOutcome = () => {
    if (!outcome) return null;
    const url = transactionUrl(chainId, outcome.txHash);
    const proposed = outcome.status === "proposed";

    return (
      <Result
        status={proposed ? "info" : "success"}
        title={proposed ? t("attestSafeProposed") : t("attestSuccess")}
        subTitle={
          <div className="flex flex-col items-center gap-1">
            {proposed && outcome.threshold ? (
              <span>
                {t("attestSafeConfirmations", {
                  confirmations: outcome.confirmations ?? 1,
                  threshold: outcome.threshold,
                })}
              </span>
            ) : null}
            <Mono value={outcome.txHash} />
          </div>
        }
        extra={
          url ? (
            <Button href={url} target="_blank" rel="noopener noreferrer">
              {t("attestViewTransaction")}
            </Button>
          ) : null
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Typography.Title level={5} className="!mb-0">
        {t("attestTitle")}
      </Typography.Title>

      {attestationsQuery.isError ? <Alert type="error" showIcon title={t("attestLoadError")} /> : null}

      {data?.financedBy ? (
        <Alert type="warning" showIcon title={t("attestFinancedBy", { wallet: data.financedBy })} />
      ) : null}

      {data && data.attestations.length === 0 ? (
        <Typography.Text type="secondary" className="text-sm">
          {t("attestNone")}
        </Typography.Text>
      ) : null}

      {data?.attestations.map((attestation) => (
        <div
          key={attestation.verifier}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ant-color-border-secondary)] px-3 py-2"
        >
          <span className="flex items-center gap-2">
            <Tag color={ROLE_COLORS[attestation.role]}>{t(`attestRoles.${attestation.role}`)}</Tag>
            <Mono value={attestation.verifier} />
            {verifier && attestation.verifier === verifier.account ? <Tag color="green">{t("attestYou")}</Tag> : null}
          </span>
          {attestation.attestedAt ? (
            <Typography.Text type="secondary" className="text-xs">
              {format.dateTime(new Date(attestation.attestedAt * 1000), { dateStyle: "medium", timeStyle: "short" })}
            </Typography.Text>
          ) : null}
        </div>
      ))}

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--ant-color-border-secondary)] p-4">
        <Typography.Text strong>{t("attestAsVerifier")}</Typography.Text>
        {stage === "done" ? renderOutcome() : null}
        {stage === "review" ? renderReview() : null}
        {stage === "wallet" && verifier ? renderEligibility() : null}
        {stage === "wallet" && !verifier ? (
          <>
            <Typography.Text type="secondary" className="text-sm">
              {t("attestIntro")}
            </Typography.Text>
            <div className="flex justify-end">
              <Button type="primary" loading={busy === "connect"} onClick={() => checkEligibility(null)}>
                {t("attestConnect")}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
