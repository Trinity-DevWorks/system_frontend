import fs from "node:fs";
import path from "node:path";

const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".git")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function lookup(root, dottedKey) {
  return dottedKey.split(".").reduce((node, key) => (node && typeof node === "object" ? node[key] : undefined), root);
}

const missing = [];

for (const file of walk(".")) {
  const src = fs.readFileSync(file, "utf8");
  const namespaces = [...src.matchAll(/useTranslations\(\s*["']([\w.]+)["']\s*\)/g)].map((m) => m[1]);
  if (namespaces.length !== 1) continue;
  const ns = namespaces[0];
  const nsObj = lookup(en, ns);
  if (!nsObj || typeof nsObj !== "object") {
    missing.push(`${file} | namespace missing: ${ns}`);
    continue;
  }
  for (const match of src.matchAll(/\bt\(\s*["']([\w.]+)["']/g)) {
    const key = match[1];
    if (lookup(nsObj, key) === undefined) missing.push(`${file} | ${ns}.${key}`);
  }
}

console.log(`missing: ${missing.length}`);
for (const line of missing) console.log(line);
