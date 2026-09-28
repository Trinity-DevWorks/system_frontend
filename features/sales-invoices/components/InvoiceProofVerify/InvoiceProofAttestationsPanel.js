"use client";

import {
  AttestationError,
  readAttestations,
  readVerifierEligibility,
  sendAttestation,
} from "@/lib/invoice-registry-attestations";
import { useQuery } from "@tanstack/react-query";
import { App, Alert, Button, Input, Tag, Typography } from "antd";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

const ROLE_COLORS = { auditor: "blue", tax_authority: "purple", financier: "gold" };

/**
 * @param {unknown} err
 */
function attestationErrorCode(err) {
  return err instanceof AttestationError ? err.code : "failed";
}

/**
 * On-chain attestations for a verified disclosure, plus the verifier's own attest action.
 * @param {{ chainId: number; contractAddress: string; proofId: string; contentHash: string }} props
 */
export default function InvoiceProofAttestationsPanel({ chainId, contractAddress, proofId, contentHash }) {
  const t = useTranslations("InvoiceProofDisclosure");
  const format = useFormatter();
  const { message } = App.useApp();
  const attestationsQuery = useQuery({
    queryKey: ["invoice-proof-attestations", chainId, contractAddress, proofId],
    queryFn: () => readAttestations({ chainId, contractAddress, proofId }),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const data = attestationsQuery.data ?? null;
  const loadFailed = attestationsQuery.isError;
  const [verifier, setVerifier] = useState(
    /** @type {Awaited<ReturnType<typeof readVerifierEligibility>> | null} */ (null),
  );
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(/** @type {"connect" | "submit" | null} */ (null));

  const handleConnect = async () => {
    setBusy("connect");
    try {
      const eligibility = await readVerifierEligibility({ chainId, contractAddress, proofId });
      setVerifier(eligibility);
      if (eligibility.blocker) message.warning(t(`attestErrors.${eligibility.blocker}`));
    } catch (err) {
      message.error(t(`attestErrors.${attestationErrorCode(err)}`));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    if (!verifier || verifier.blocker) return;
    setBusy("submit");
    try {
      await sendAttestation({ chainId, contractAddress, proofId, contentHash, account: verifier.account, reference });
      message.success(t("attestSuccess"));
      setVerifier({ ...verifier, blocker: "already_attested" });
      setReference("");
      await attestationsQuery.refetch();
    } catch (err) {
      message.error(t(`attestErrors.${attestationErrorCode(err)}`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Typography.Title level={5} className="!mb-0">
        {t("attestTitle")}
      </Typography.Title>

      {loadFailed ? <Alert type="error" showIcon title={t("attestLoadError")} /> : null}

      {data?.financedBy ? (
        <Alert
          type="warning"
          showIcon
          title={t("attestFinancedBy", { wallet: data.financedBy })}
        />
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
            <span className="break-all font-mono text-xs" dir="ltr">
              {attestation.verifier}
            </span>
          </span>
          {attestation.attestedAt ? (
            <Typography.Text type="secondary" className="text-xs">
              {format.dateTime(new Date(attestation.attestedAt * 1000), { dateStyle: "medium", timeStyle: "short" })}
            </Typography.Text>
          ) : null}
        </div>
      ))}

      {verifier && !verifier.blocker && verifier.role ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--ant-color-border-secondary)] p-3">
          <Typography.Text className="text-sm">
            {t("attestConnected", { role: t(`attestRoles.${verifier.role}`), wallet: verifier.account })}
          </Typography.Text>
          <label className="text-sm" htmlFor="attestation-reference">
            {t("attestReferenceLabel")}
          </label>
          <Input
            id="attestation-reference"
            value={reference}
            maxLength={120}
            placeholder={t("attestReferencePlaceholder")}
            onChange={(event) => setReference(event.target.value)}
          />
          <div className="flex justify-end">
            <Button type="primary" loading={busy === "submit"} onClick={handleSubmit}>
              {t("attestSubmit")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button loading={busy === "connect"} onClick={handleConnect}>
            {t("attestConnect")}
          </Button>
        </div>
      )}
    </div>
  );
}
