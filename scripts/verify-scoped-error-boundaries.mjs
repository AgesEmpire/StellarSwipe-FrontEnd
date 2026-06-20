import { readFileSync } from "node:fs";

const files = {
  boundary: "components/ScopedErrorBoundary.tsx",
  app: "app/app/page.tsx",
  compare: "app/compare/page.tsx",
  leaderboard: "app/leaderboard/page.tsx",
  globalBoundary: "app/error-boundary-wrapper.tsx",
  globalError: "app/error.tsx",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(file, "utf8")])
);

const requiredSections = [
  ["signal-feed", source.app],
  ["trade-preview", source.app],
  ["portfolio-dashboard", source.app],
  ["comparison-tool", source.compare],
  ["leaderboard-table", source.leaderboard],
];

const failures = [];

for (const [sectionName, content] of requiredSections) {
  if (!content.includes(`sectionName="${sectionName}"`)) {
    failures.push(`Missing ScopedErrorBoundary section: ${sectionName}`);
  }

  if (!content.includes(`ErrorBoundaryTestProbe sectionName="${sectionName}"`)) {
    failures.push(`Missing deliberate throw probe for: ${sectionName}`);
  }
}

if (!source.boundary.includes("data-feature-boundary-fallback")) {
  failures.push("Scoped fallback is missing a stable fallback marker");
}

if (!source.boundary.includes("onRetry")) {
  failures.push("Scoped fallback is missing retry support");
}

if (!source.boundary.includes('NODE_ENV === "production"')) {
  failures.push("Deliberate throw probe is not disabled in production");
}

if (!source.globalBoundary.includes("<ErrorBoundary>{children}</ErrorBoundary>")) {
  failures.push("Global ErrorBoundaryProvider is no longer intact");
}

if (!source.globalError.includes("reset")) {
  failures.push("Next.js route-level error fallback is no longer intact");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Scoped feature error boundaries verified.");
