/**
 * i18n checks (npm run check:i18n). Exits 1 when any problem is found.
 *
 * 1. Code keys: every literal key passed to a translator (`t("key")`, `t.rich("key")`, ...)
 *    must exist in messages/en.json under the namespace that translator is bound to.
 *    - Translators are found from `const <name> = useTranslations("Ns")` and
 *      `const <name> = await getTranslations("Ns" | { namespace: "Ns" })`.
 *    - Dynamic namespaces like `useTranslations(config.i18n)` are resolved through the
 *      files that render the component with `config={someConfig}` and read the namespaces
 *      those configs declare (e.g. `i18n: "SalesCreditNotes"`). A key missing from all of
 *      them is an error; missing from only some is a warning (keys are often guarded by kind).
 *      Anything that cannot be resolved is counted as unchecked, not missing.
 *    - Template-literal keys (`t(\`status${x}\`)`) are skipped and counted.
 * 2. Locales: every other messages/*.json must have exactly the keys of en.json
 *    (no missing, no extra), and no key name may contain non-ASCII characters.
 */
import fs from "node:fs";
import path from "node:path";

const MESSAGES_DIR = "messages";
const BASE_LOCALE = "en";
const SOURCE_DIRS = ["app", "features", "shared", "lib", "i18n", "shell"];
const SOURCE_EXT = /\.(js|jsx|ts|tsx|mjs)$/;
const TRANSLATOR_METHODS = ["rich", "markup", "raw"];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const lookup = (root, dotted) =>
  dotted.split(".").reduce((node, key) => (node && typeof node === "object" ? node[key] : undefined), root);

/** Flatten nested messages into dotted leaf keys. */
function flatten(node, prefix = "", out = []) {
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, full, out);
    else out.push(full);
  }
  return out;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (SOURCE_EXT.test(entry.name)) acc.push(full);
  }
  return acc;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

const en = readJson(path.join(MESSAGES_DIR, `${BASE_LOCALE}.json`));
const files = SOURCE_DIRS.flatMap((dir) => walk(dir));
const sources = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));

/** Resolve an import specifier from `fromFile` to a source file we have. */
function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = path.join(path.dirname(fromFile), spec);
  else return null;
  const candidates = [base, ...[".js", ".jsx", ".ts", ".tsx"].map((ext) => base + ext), path.join(base, "index.js")];
  return candidates.map((c) => path.normalize(c)).find((c) => sources.has(c)) ?? null;
}

/**
 * Namespaces a component may receive through `config.<prop>`: look at every file that
 * imports the component, take the identifier it passes as `config={...}`, follow that
 * import to the config module and read `<prop>: "Namespace"` from it.
 */
function resolveConfigNamespaces(componentFile, prop) {
  const name = path.basename(componentFile).replace(SOURCE_EXT, "");
  const found = new Set();
  for (const [caller, src] of sources) {
    if (caller === componentFile) continue;
    const importsComponent = [...src.matchAll(/import\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g)].some(
      (m) => resolveImport(caller, m[1]) === componentFile,
    );
    if (!importsComponent) continue;
    const usage = new RegExp(`<${escapeRe(name)}\\b[^>]*?\\bconfig=\\{\\s*([A-Za-z_$][\\w$]*)\\s*\\}`, "g");
    for (const [, configIdent] of src.matchAll(usage)) {
      const importRe = new RegExp(`import\\s*\\{[^}]*\\b${escapeRe(configIdent)}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`);
      const configFile = importRe.exec(src) ? resolveImport(caller, importRe.exec(src)[1]) : caller;
      const configSrc = configFile ? sources.get(configFile) : null;
      const value = configSrc && new RegExp(`\\b${escapeRe(prop)}\\s*:\\s*["']([\\w.]+)["']`).exec(configSrc);
      if (value) found.add(value[1]);
    }
  }
  return [...found];
}

/** Translator bindings in a file, in source order: { ident, index, namespaces | null, label }. */
function findBindings(file, src) {
  const bindings = [];
  const re =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*([^)]*?)\s*\)/g;
  for (const m of src.matchAll(re)) {
    const [, ident, rawArg] = m;
    let namespaces = null;
    let label = rawArg;
    const literal = /^["']([\w.]+)["']$/.exec(rawArg) ?? /namespace\s*:\s*["']([\w.]+)["']/.exec(rawArg);
    const configProp = /^config\.([A-Za-z_$][\w$]*)$/.exec(rawArg);
    if (rawArg === "" || /^\{\s*locale\s*\}$/.test(rawArg)) namespaces = [""];
    else if (literal) namespaces = [literal[1]];
    else if (configProp) {
      const resolved = resolveConfigNamespaces(file, configProp[1]);
      if (resolved.length > 0) namespaces = resolved;
    }
    bindings.push({ ident, index: m.index, namespaces, label });
  }
  return bindings;
}

const missing = [];
const partial = [];
const unresolved = [];
let checkedCalls = 0;
let uncheckedCalls = 0;
let dynamicKeyCalls = 0;

for (const [file, src] of sources) {
  const bindings = findBindings(file, src);
  if (bindings.length === 0) continue;

  for (const ident of new Set(bindings.map((b) => b.ident))) {
    const own = bindings.filter((b) => b.ident === ident);
    const methods = TRANSLATOR_METHODS.map(escapeRe).join("|");
    const callRe = new RegExp(`(?<![\\w$.])${escapeRe(ident)}(?:\\.(?:${methods}))?\\(\\s*(["'\`])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1`, "g");
    for (const m of src.matchAll(callRe)) {
      const [, quote, key] = m;
      // A call belongs to the closest binding of the same name declared before it.
      const binding = own.filter((b) => b.index < m.index).at(-1);
      if (!binding) continue;
      if (quote === "`" && key.includes("${")) {
        dynamicKeyCalls += 1;
        continue;
      }
      if (!binding.namespaces) {
        uncheckedCalls += 1;
        if (!unresolved.some((u) => u.file === file && u.label === binding.label)) unresolved.push({ file, label: binding.label });
        continue;
      }
      checkedCalls += 1;
      const where = `${file}:${lineOf(src, m.index)}`;
      const absent = binding.namespaces.filter((ns) => typeof lookup(en, ns ? `${ns}.${key}` : key) !== "string");
      if (absent.length === 0) continue;
      const via = binding.label.startsWith("config.") ? ` (via ${binding.label})` : "";
      if (absent.length === binding.namespaces.length) {
        missing.push(`${where} | ${absent.map((ns) => (ns ? `${ns}.${key}` : key)).join(", ")}${via}`);
      } else {
        // Shared components often guard keys by kind (e.g. quotation-only buttons), so a key
        // present in at least one of the component's namespaces is a warning, not an error.
        const present = binding.namespaces.filter((ns) => !absent.includes(ns));
        partial.push(`${where} | ${key}: in ${present.join(", ")}, not in ${absent.join(", ")}${via}`);
      }
    }
  }
}

// Locale files vs en.json.
const baseKeys = new Set(flatten(en));
const localeProblems = [];
const nonAscii = /[^\x00-\x7F]/;
for (const file of fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json")).sort()) {
  const locale = file.replace(/\.json$/, "");
  const keys = flatten(readJson(path.join(MESSAGES_DIR, file)));
  const keySet = new Set(keys);
  for (const key of keys) if (nonAscii.test(key)) localeProblems.push(`${locale} | non-ASCII key name: ${key}`);
  if (locale === BASE_LOCALE) continue;
  for (const key of baseKeys) if (!keySet.has(key)) localeProblems.push(`${locale} | missing: ${key}`);
  for (const key of keySet) if (!baseKeys.has(key)) localeProblems.push(`${locale} | extra (not in ${BASE_LOCALE}): ${key}`);
}

const uniqueMissing = [...new Set(missing)];
console.log(`Code keys: ${checkedCalls} checked, ${uniqueMissing.length} missing in ${BASE_LOCALE}.json`);
for (const line of uniqueMissing) console.log(`  ${line}`);
const uniquePartial = [...new Set(partial)];
if (uniquePartial.length) {
  console.log(`Warnings: ${uniquePartial.length} key(s) exist in only some namespaces of a shared component (fine if guarded by kind)`);
  for (const line of uniquePartial) console.log(`  ${line}`);
}
console.log(
  `Skipped: ${dynamicKeyCalls} template-literal keys, ${uncheckedCalls} calls with an unresolved namespace` +
    (unresolved.length ? ` (${unresolved.map((u) => `${u.file}: ${u.label}`).join("; ")})` : ""),
);
console.log(`Locale files: ${localeProblems.length} problem(s)`);
for (const line of localeProblems) console.log(`  ${line}`);

const problems = uniqueMissing.length + localeProblems.length;
console.log(problems === 0 ? "i18n check passed." : `i18n check failed: ${problems} problem(s).`);
process.exit(problems === 0 ? 0 : 1);
