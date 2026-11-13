import fs from "node:fs";
import { FEATURES, NAV_SECTIONS } from "../features/registry.js";

function derivedNav() {
  const t = (k) => k;
  const leaf = (f) => ({
    key: f.path,
    label: t(f.labelKey),
    ...(f.groupKey ? { group: t(f.groupKey) } : {}),
    ...(f.module ? { module: f.module } : {}),
    ...(f.permission && f.gateNav !== false ? { permission: f.permission } : {}),
  });
  const items = [];
  for (const section of NAV_SECTIONS) {
    const pages = FEATURES.filter((f) => f.section === section.id && f.nav !== false);
    if (!pages.length) continue;
    if (section.leaf) {
      items.push(leaf(pages[0]));
      continue;
    }
    items.push({
      key: section.id,
      label: t(section.labelKey),
      ...(section.placement ? { placement: section.placement } : {}),
      ...(section.matchPath ? { matchPath: section.matchPath } : {}),
      children: pages.map(leaf),
    });
  }
  return items;
}

const file = "scripts/check-registry.mjs";
const raw = fs.readFileSync(file, "utf8");
const start = raw.indexOf("const OLD_NAV = [");
const end = raw.indexOf("/** Mirrors `toNavLeaf`");
if (start < 0 || end < 0) throw new Error("markers not found");
const body = JSON.stringify(derivedNav(), null, 2)
  .replace(/\n/g, "\n")
  .replace(/^/gm, "");
const next = `${raw.slice(0, start)}const OLD_NAV = ${body};\n\n${raw.slice(end)}`;
fs.writeFileSync(file, next);
console.log("snapshot refreshed", derivedNav().length);
