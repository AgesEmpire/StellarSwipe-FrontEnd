import fs from "node:fs";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const config = JSON.parse(fs.readFileSync("renovate.json", "utf8"));
const docs = fs.readFileSync("docs/dependency-updates.md", "utf8");

assert(
  Array.isArray(config.extends) &&
    config.extends.includes("config:recommended"),
  "Renovate extends the recommended baseline"
);
assert(config.dependencyDashboard === true, "dependency dashboard is enabled");
assert(config.automerge === false, "dependency updates are not automerged");
assert(
  config.prConcurrentLimit > 0 && config.prHourlyLimit > 0,
  "PR rate limits are configured"
);
assert(
  Array.isArray(config.labels) && config.labels.includes("dependencies"),
  "default dependency label is configured"
);
assert(
  config.vulnerabilityAlerts &&
    Array.isArray(config.vulnerabilityAlerts.labels) &&
    config.vulnerabilityAlerts.labels.includes("security"),
  "security updates receive a security label"
);

const packageRules = config.packageRules ?? [];
const hasPatchMinorGroup = packageRules.some(
  (rule) =>
    rule.groupName === "non-major dependency updates" &&
    rule.matchUpdateTypes?.includes("minor") &&
    rule.matchUpdateTypes?.includes("patch")
);
const hasMajorSeparation = packageRules.some(
  (rule) =>
    rule.matchUpdateTypes?.includes("major") &&
    rule.dependencyDashboardApproval === true
);
const hasDevGroup = packageRules.some(
  (rule) =>
    rule.groupName === "dev dependency updates" &&
    rule.matchDepTypes?.includes("devDependencies")
);

assert(hasPatchMinorGroup, "patch/minor updates are grouped");
assert(hasMajorSeparation, "major updates require dashboard approval");
assert(hasDevGroup, "dev dependency updates are grouped separately");

assert(
  docs.includes("Renovate") &&
    docs.includes("security") &&
    docs.includes("major") &&
    docs.includes("CI"),
  "maintenance documentation covers Renovate, security, major updates, and CI"
);

console.log("Renovate dependency update policy verified");
