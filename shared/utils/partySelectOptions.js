/**
 * Display helpers for plain antd Selects that list customers / suppliers:
 * the option `label` is the name (what the field shows once picked), `subLabel` the phone
 * (shown in grey in the dropdown), `title` the code (on hover) and `searchText` everything the user may type.
 * ServerSearchSelect renders `subLabel` on its own; use these with a plain `<Select>`.
 */

/**
 * @param {{ value: unknown; label?: unknown; data?: Record<string, unknown> }} option
 */
export function partyOptionRender(option) {
  const data = option?.data ?? {};
  const subLabel = typeof data.subLabel === "string" && data.subLabel.trim() ? data.subLabel.trim() : null;
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : undefined;
  if (!subLabel) return title ? <span title={title}>{option.label}</span> : option.label;
  return (
    <span className="flex min-w-0 items-center justify-between gap-3" title={title}>
      <span className="truncate">{option.label}</span>
      <span className="shrink-0 text-xs opacity-60">{subLabel}</span>
    </span>
  );
}

/**
 * Matches the typed text against the name, the code and any extra `searchText`.
 * @param {string} input
 * @param {Record<string, unknown> | undefined} option
 */
export function partyFilterOption(input, option) {
  const needle = String(input ?? "").trim().toLowerCase();
  if (!needle) return true;
  return [option?.label, option?.subLabel, option?.searchText].some(
    (part) => part != null && String(part).toLowerCase().includes(needle),
  );
}

/**
 * Builds a Select option for a customer / supplier row.
 * @param {Record<string, unknown>} row
 * @param {string} codeField e.g. "supplier_code"
 */
export function partySelectOption(row, codeField) {
  const code = typeof row[codeField] === "string" ? String(row[codeField]).trim() : "";
  const name = String(row.name ?? row.id);
  const phone = typeof row.phone === "string" ? row.phone.trim() : "";
  return {
    value: row.id,
    label: name,
    subLabel: phone || undefined,
    title: code || undefined,
    searchText: [code, name, row.phone].filter(Boolean).join(" "),
  };
}

/**
 * `labelRender` for the picked value: the name, with the code on hover.
 * @param {{ value: unknown; title?: string }[]} options
 */
export function partyLabelRender(options) {
  /** @param {{ value: unknown; label: unknown }} props */
  function PartyLabel(props) {
    const row = options.find((option) => String(option.value) === String(props.value));
    return row?.title ? <span title={row.title}>{props.label}</span> : props.label;
  }
  return PartyLabel;
}
