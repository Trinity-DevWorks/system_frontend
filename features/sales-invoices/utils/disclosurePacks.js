/**
 * Ready field sets for a selective-disclosure proof.
 * A pack selects sealed leaves by path. It does not change what the blockchain stores.
 */

/**
 * @typedef {"auditor" | "tax_authority" | "financier"} DisclosurePackId
 * @typedef {{
 *   id: DisclosurePackId;
 *   fileSlug: string;
 *   salesOnly: boolean;
 *   exact: string[];
 *   parties: { supplier: string[]; buyer: string[] };
 *   paymentTerms?: string[];
 *   lines: string[];
 * }} DisclosurePack
 */

/** @type {DisclosurePack[]} */
export const DISCLOSURE_PACKS = [
  {
    id: "auditor",
    fileSlug: "auditor",
    salesOnly: false,
    exact: ["proof_id", "invoice_number", "invoice_date", "due_on", "currency_code", "subtotal", "tax_total", "grand_total"],
    parties: {
      supplier: ["name", "legal_name", "tax_number"],
      buyer: ["name", "legal_name", "tax_number"],
    },
    lines: ["item_code", "item_name", "quantity", "unit_price", "line_total"],
  },
  {
    id: "tax_authority",
    fileSlug: "tax",
    salesOnly: false,
    exact: ["proof_id", "invoice_number", "invoice_date", "currency_code", "tax_total", "grand_total"],
    parties: {
      supplier: ["legal_name", "tax_number"],
      buyer: ["legal_name", "tax_number"],
    },
    lines: ["item_code", "item_name", "tax_rate", "tax_amount", "line_total"],
  },
  {
    id: "financier",
    fileSlug: "financier",
    salesOnly: true,
    exact: ["proof_id", "invoice_number", "invoice_date", "due_on", "currency_code", "grand_total"],
    parties: {
      supplier: ["name", "legal_name"],
      buyer: ["name", "legal_name", "tax_number"],
    },
    paymentTerms: ["code", "name", "due_days"],
    lines: ["line_total"],
  },
];

/**
 * @param {"sales" | "purchase"} audience
 * @returns {DisclosurePack[]}
 */
export function packsForAudience(audience) {
  return DISCLOSURE_PACKS.filter((pack) => audience === "sales" || !pack.salesOnly);
}

/**
 * @param {string} path
 * @param {DisclosurePack} pack
 */
function pathInPack(path, pack) {
  if (pack.exact.includes(path)) return true;
  const party = /^(supplier|buyer)\.([^.]+)$/.exec(path);
  if (party && pack.parties[party[1]]?.includes(party[2])) return true;
  const terms = /^payment_terms\.([^.]+)$/.exec(path);
  if (terms && pack.paymentTerms?.includes(terms[1])) return true;
  const line = /^lines\.\d+\.([^.]+)$/.exec(path);
  return Boolean(line && pack.lines.includes(line[1]));
}

/**
 * @param {Array<{ path: string }>} fields
 * @param {DisclosurePack} pack
 * @returns {string[]}
 */
export function pathsForPack(fields, pack) {
  const paths = [];
  for (const field of fields) {
    if (field && typeof field.path === "string" && pathInPack(field.path, pack)) paths.push(field.path);
  }
  return paths;
}

/**
 * Appointed verifiers of this role on the side that owns the invoice.
 * Sales names supplier-side verifiers. Purchases name buyer-side verifiers.
 *
 * @param {Array<{ name?: string; role?: string; party_side?: string; chain_status?: string }>} verifiers
 * @param {DisclosurePackId} packId
 * @param {"sales" | "purchase"} audience
 * @returns {string[]}
 */
export function verifierNamesForPack(verifiers, packId, audience) {
  const side = audience === "purchase" ? "buyer" : "supplier";
  const names = [];
  for (const row of verifiers) {
    if (!row || row.role !== packId || row.chain_status === "removing") continue;
    const partySide = row.party_side === "buyer" ? "buyer" : "supplier";
    if (partySide !== side) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (name !== "" && !names.includes(name)) names.push(name);
  }
  return names;
}
