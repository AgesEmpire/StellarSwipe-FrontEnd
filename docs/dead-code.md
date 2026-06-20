# Dead-Code Detection

This project uses [Knip](https://knip.dev) to detect unused files, exports, types, dependencies, and package-script binaries in the frontend codebase.

Run the check locally before opening a PR:

```sh
npm run lint:dead-code
```

CI runs the same command for every pull request and push to `main`.

## Scope

`knip.json` covers the active frontend source areas called out in issue #262:

- `app/`
- `components/`
- `hooks/`
- `lib/`
- `services/`
- `store/`

It also includes the existing `src/tracing/` test-covered utility and root config files that are part of the current frontend toolchain.

## Triage Rules

When Knip reports a finding:

1. Remove code, dependencies, or exports that are genuinely no longer used.
2. Keep code only when it is intentionally staged for a near-term product surface, a public UI utility API, or a tested helper that is consumed indirectly by tooling.
3. Add any kept false positive to `knip.json` with the narrowest possible pattern.
4. Include the reason in this document or in the PR description when adding a new exception.

The initial baseline had a set of product components, stores, and service modules that are not currently imported by routed pages but appear to be staged feature surfaces rather than safe deletions. Those are listed in `ignoreFiles` so CI can start preventing new dead-code drift without deleting potential roadmap work in this PR.

Two clearly unused Radix dependencies were removed during the initial triage:

- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-tooltip`

`tailwindcss` is intentionally listed under `ignoreDependencies` because it is consumed by PostCSS through `@tailwindcss/postcss` rather than imported from application source.

## Trade Modal Triage

Issue #262 called out two `TradeModal` implementations:

- `components/TradeModal.tsx`
- `components/trade/TradeModal.tsx`

They are intentionally distinct:

- `components/TradeModal.tsx` is the richer order-placement modal used by the authenticated app and signal cards.
- `components/trade/SwapModal.tsx` is the lightweight landing-page token swap modal.

The landing-page file and export were renamed from `TradeModal` to `SwapModal` so future Knip findings and reviews no longer have two unrelated components with the same name.
