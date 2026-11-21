import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const isStorybook = process.argv.some((arg) => arg.includes("storybook"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  experimental: {
    instrumentationHook: !isStorybook,
  },
  images: {
    // #436: explicit avatar/image host allowlist — no wildcard hostnames.
    // Only hosts listed here may be optimised by next/image. Arbitrary
    // user-supplied avatar URLs are rejected client-side by
    // `isAllowedAvatarUrl` (lib/avatarHosts.ts) and fall back to initials.
    // To add a provider avatar host safely: add the exact hostname (and path
    // prefix if the CDN is shared) to BOTH this list and lib/avatarHosts.ts,
    // then document it in docs/avatar-host-allowlist.md.
    remotePatterns: [
      // Generated identicon/avatar service used by leaderboard + provider profiles
      { protocol: "https", hostname: "api.dicebear.com", pathname: "/7.x/**" },
      // GitHub-hosted avatars (provider profiles linked to GitHub accounts)
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Gravatar (email-derived avatars)
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "www.gravatar.com" },
    ],
  },
};

const configWithBundleAnalyzer = withBundleAnalyzer(nextConfig);

export default isStorybook
  ? nextConfig
  : withSentryConfig(configWithBundleAnalyzer, {
      org: "your-org",
      project: "your-project",
      silent: true,
      widenClientFileUpload: true,
      webpack: {
        reactComponentAnnotation: { enabled: true },
        treeshake: { removeDebugLogging: true },
        automaticVercelMonitors: true,
      },
      hideSourceMaps: true,
    });
