import fs from "node:fs";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const layout = fs.readFileSync("app/layout.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
const docs = fs.readFileSync("docs/font-loading.md", "utf8");

assert(
  layout.includes('from "next/font/google"'),
  "fonts are loaded through next/font/google"
);
assert(/Inter\(\{[\s\S]*display:\s*"swap"/.test(layout), "Inter uses font-display swap");
assert(
  /Inter\(\{[\s\S]*fallback:\s*\[[^\]]*"system-ui"[^\]]*"sans-serif"/.test(layout),
  "Inter declares stable fallback fonts"
);
assert(
  /JetBrains_Mono\(\{[\s\S]*display:\s*"swap"/.test(layout),
  "JetBrains Mono uses font-display swap"
);
assert(
  /JetBrains_Mono\(\{[\s\S]*fallback:\s*\[[^\]]*"ui-monospace"[^\]]*"monospace"/.test(layout),
  "JetBrains Mono declares stable fallback fonts"
);
assert(
  css.includes("var(--font-sans), system-ui, sans-serif"),
  "global body font stack preserves system fallbacks"
);
assert(
  docs.includes("next/font") &&
    docs.includes("CLS") &&
    docs.includes("Lighthouse") &&
    docs.includes("locales"),
  "font loading audit documents next/font, CLS, Lighthouse, and locale coverage"
);

console.log("font loading audit verified");
