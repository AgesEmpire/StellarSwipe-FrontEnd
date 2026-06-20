import { readFileSync } from "node:fs";

const component = readFileSync("components/SignalRecommendations.tsx", "utf8");
const engine = readFileSync("services/recommendationEngine.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const failures = [];

const requiredComponentSnippets = [
  "function RecommendationExplanation",
  "formatExplanation(reasons, score)",
  "role=\"tooltip\"",
  "aria-describedby={tooltipId}",
  "aria-expanded={open}",
  "onMouseEnter={() => setOpen(true)}",
  "onFocus={() => setOpen(true)}",
  "onClick={(event) => {",
  "Recommended from the current signal score",
  "plus ${extraCount} more factor",
];

for (const snippet of requiredComponentSnippets) {
  if (!component.includes(snippet)) {
    failures.push(`Missing component affordance snippet: ${snippet}`);
  }
}

if (!engine.includes("reasons.push")) {
  failures.push("Recommendation engine does not expose factor-derived reasons");
}

if (!packageJson.scripts?.["verify:recommendation-explainability"]) {
  failures.push("Missing npm verification script");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Recommendation explainability tooltip verified.");
