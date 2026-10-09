/**
 * Which party's verifiers a screen shows.
 * `supplier` is the company that issued the sales invoice.
 * `buyer` is the company that posted the purchase invoice.
 * `both` is a linked invoice, where each side keeps its own list.
 *
 * @param {unknown} attestations
 * @param {"supplier" | "buyer" | "both"} view
 */
export function visibleAttestations(attestations, view) {
  const list = Array.isArray(attestations) ? attestations : [];
  return list.filter((attestation) => {
    if (!attestation || typeof attestation !== "object") return false;
    const side = attestation.party_side === "buyer" ? "buyer" : "supplier";
    if (attestation.role === "financier" && side !== "supplier") return false;
    if (view === "buyer") return side === "buyer";
    if (view === "supplier") return side === "supplier";
    return true;
  });
}

/**
 * Who appointed this verifier, from the person looking at the invoice.
 * A supplier viewer is the selling company. A buyer viewer is the buying company.
 * A public viewer is neither company, so the label never says "us".
 *
 * @param {unknown} partySide
 * @param {"supplier" | "buyer" | "public"} viewer
 */
export function attestationSideLabelKey(partySide, viewer) {
  const side = partySide === "buyer" ? "buyer" : "supplier";
  if (viewer === "public") {
    return side === "buyer" ? "attestationByCustomer" : "attestationBySupplier";
  }
  if (viewer === "buyer") {
    return side === "buyer" ? "attestationByUs" : "attestationBySupplier";
  }
  return side === "supplier" ? "attestationByUs" : "attestationByCustomer";
}
