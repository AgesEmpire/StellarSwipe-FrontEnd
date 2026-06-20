# Persisted Zustand Store Hydration

Persisted Zustand stores should not read `localStorage` during the first client render. In Next.js that can make the client render a saved value while the server HTML was produced from the default value, causing hydration mismatch warnings and visible flicker.

## Shared Pattern

Every persisted store must use `createPersistedState` and `withPersistedHydration` from `store/persistHydration.ts`.

The helper adds:

- `isHydrated`, initially `false`
- `setHydrated`, used by the persist lifecycle
- `skipHydration: true`, so `localStorage` is not read synchronously during the first client render
- a shared `partialize` wrapper, so runtime hydration flags are not written back into `localStorage`

The root layout mounts `PersistedStoreHydration`, which calls `store.persist.rehydrate()` after the app has mounted. Components render the same default state on the server and initial client render, then update after the persisted state has been loaded.

## Component Guidance

Components that expose persisted values directly in labels, icons, modals, or high-visibility controls should read `isHydrated` and render a neutral loading state until it is `true`.

Examples:

- theme controls should avoid showing the saved theme icon before hydration
- onboarding should not flash before the saved dismissed/completed state is loaded
- filters, bookmarks, wallets, and saved settings should rely on the root rehydration pass before showing persisted values

## Adding A New Persisted Store

1. Extend the store interface with `PersistHydrationState`.
2. Spread `createPersistedState(set)` into the initial store state.
3. Wrap persist options with `withPersistedHydration`.
4. Add the store to `components/PersistedStoreHydration.tsx`.
5. Run:

```sh
npm run verify:persist-hydration
```
