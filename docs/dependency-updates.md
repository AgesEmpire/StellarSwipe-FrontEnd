# Dependency Updates

This repository uses Renovate to open dependency update pull requests automatically.

## Update Grouping

Renovate groups routine patch and minor production dependency updates into a single `non-major dependency updates` pull request. Patch and minor development dependency updates are grouped separately as `dev dependency updates`.

Major version upgrades are separated from routine updates and require approval from the Renovate dependency dashboard before Renovate opens the pull request. This keeps large framework changes, such as Next.js, React, Zustand, React Query, and testing-tool upgrades, visible for explicit review.

## Security Updates

Security-relevant updates receive the `security` label in addition to the default `dependencies` label. Review those first and avoid batching them with unrelated feature work.

## CI Review Policy

Renovate pull requests should go through the same checks as any other pull request in this repository. When CI workflows are present, keep dependency PRs blocked until the configured pull-request checks pass. If a dependency PR changes generated lockfile contents, review both `package.json` and `package-lock.json` before merging.

## Maintainer Workflow

1. Review the dependency dashboard for pending major updates.
2. Approve only one risky major update at a time.
3. Prioritize PRs labeled `security`.
4. Merge routine grouped updates only after CI passes and the app still builds locally or in CI.
5. Close or rebase stale dependency PRs instead of merging outdated lockfile changes.
