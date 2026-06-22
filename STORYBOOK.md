# Storybook PR Preview

This project uses [Storybook](https://storybook.js.org/) for component development and visual testing.

## Local Development

```bash
# Start Storybook dev server
npm run storybook

# Build Storybook statically
npm run build-storybook
```

## PR Preview Deployment

Every pull request that modifies components, stories, or Storybook configuration automatically:

1. Builds the Storybook static output
2. Deploys it to GitHub Pages at `https://agesempire.github.io/StellarSwipe-FrontEnd/pr-<PR_NUMBER>/`
3. Posts a comment on the PR with the preview URL
4. Cleans up the preview when the PR is merged or closed

## Writing Stories

Stories should be co-located with their components:

```
components/
  Footer.tsx
  Footer.stories.tsx   ← Story file
```

See [Storybook's writing stories guide](https://storybook.js.org/docs/writing-stories) for patterns.
