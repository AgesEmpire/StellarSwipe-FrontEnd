import { existsSync, readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const docsPath = "docs/accessibility/forced-colors.md";
const docs = existsSync(docsPath) ? readFileSync(docsPath, "utf8") : "";

const failures = [];

const requiredCssSnippets = [
  "@media (forced-colors: active)",
  "forced-color-adjust",
  "Canvas",
  "CanvasText",
  "ButtonFace",
  "ButtonText",
  "Highlight",
  "HighlightText",
  ":focus-visible",
  "[aria-pressed=\"true\"]",
  "[role=\"switch\"][aria-checked=\"true\"]",
  "border-style: double",
  "border-style: dashed",
];

for (const snippet of requiredCssSnippets) {
  if (!css.includes(snippet)) {
    failures.push(`Missing forced-colors CSS snippet: ${snippet}`);
  }
}

if (!packageJson.scripts?.["verify:forced-colors"]) {
  failures.push("Missing verify:forced-colors npm script");
}

const requiredDocSnippets = [
  "forced-colors",
  "Windows High Contrast",
  "Focus indicators",
  "status badges",
  "new components",
];

for (const snippet of requiredDocSnippets) {
  if (!docs.includes(snippet)) {
    failures.push(`Missing forced-colors documentation snippet: ${snippet}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Forced-colors support verified.");
