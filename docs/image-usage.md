# Image Usage Audit

This audit covers image usage in `app/`, `components/`, and static image assets under `public/`.

## Current Inventory

No current image elements were found in `app/` or `components/`.

- No plain `<img>` tags are present.
- No `next/image` imports are currently needed because the app shell does not render bitmap or SVG image elements.
- No CSS image backgrounds are used in the audited source directories.
- `public/` currently contains locale JSON files only, with no image assets.

Because there are no active image elements, there are no plain `<img>` tags to migrate in this PR and no above-the-fold image that needs `priority` today.

## Policy For Future Images

When a future page or component adds an image:

1. Prefer `next/image` over a plain `<img>` tag for local or remote content images.
2. Add `sizes` for responsive images that can render at different viewport widths.
3. Add `priority` only for the single most important above-the-fold image, such as a hero or LCP-critical product image.
4. Keep decorative vector-only UI in CSS or inline SVG when it is not content imagery.
5. Update this audit when image inventory changes.

## Lighthouse Review

The current landing page has no rendered content images, so image-specific Lighthouse findings such as oversized images, missing dimensions, or unoptimized image formats should not apply to the current app shell.

When future images are added, run Lighthouse on the landing page and any image-heavy route. The expected outcome is no regression in image-related audits, with `next/image` handling sizing, lazy loading, and optimization where applicable.

## Regression Check

Run the static audit before opening a PR that touches image usage:

```sh
npm run verify:image-usage
```

The check fails if new plain `<img>` tags, CSS image backgrounds, or public image assets appear without updating this audit.
