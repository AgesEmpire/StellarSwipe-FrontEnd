# Font Loading Audit

StellarSwipe loads its application fonts through `next/font/google` in `app/layout.tsx`.

## Current Font Stack

- `Inter` is the primary sans-serif UI font and is exposed as `--font-sans`.
- `JetBrains_Mono` is the monospace font and is exposed as `--font-mono`.
- Both fonts use `display: "swap"` so text remains visible while the webfont loads.
- Both fonts declare explicit fallback stacks to keep metrics stable if a webfont is delayed or unavailable.

The global body stack in `app/globals.css` remains:

```css
font-family: var(--font-sans), system-ui, sans-serif;
```

This preserves the system fallback path for browsers or locales where the primary webfont is not immediately available.

## CLS And Lighthouse Review

The previous implementation already used `next/font`, so this change is an audit and hardening pass rather than a migration away from plain CSS font imports. The explicit `display` and fallback settings reduce the chance that text is invisible or unstable during font download.

For a production Lighthouse check, compare the landing page before and after this change and confirm the Cumulative Layout Shift (CLS) score is stable or improved. The local repository currently has unrelated baseline build failures, so the repeatable check for this PR is the static `npm run verify:font-loading` audit.

## Locale Coverage

The app currently imports the `latin` subset for both configured fonts. No non-Latin locale font is loaded in the current app shell. If a future locale requires non-Latin glyph coverage, add the relevant subset or a locale-specific font and update this audit before enabling that locale in production.

## Visual Review Checklist

When the app build baseline is healthy, verify these pages after a hard reload:

1. Landing page
2. Signal feed
3. Portfolio or dashboard view

Check that text is visible immediately, no large layout jump occurs when fonts finish loading, and monospace labels retain stable width.
