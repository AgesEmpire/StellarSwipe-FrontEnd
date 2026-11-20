// @ts-check

/**
 * @typedef {{ key: string; value: string }} SecurityHeader
 * @typedef {Record<string, string | undefined>} HeaderEnvironment
 */

const DEFAULT_STELLAR_CONNECT_ORIGINS = Object.freeze([
  "https://horizon.stellar.org",
  "https://horizon-testnet.stellar.org",
  "https://horizon-futurenet.stellar.org",
  "https://soroban-testnet.stellar.org",
  "https://rpc-futurenet.stellar.org",
]);

const DEFAULT_SENTRY_CONNECT_ORIGINS = Object.freeze([
  "https://*.ingest.sentry.io",
  "https://*.ingest.us.sentry.io",
  "https://*.ingest.de.sentry.io",
]);

const ENV_CONNECT_KEYS = Object.freeze([
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SOROBAN_RPC_URL",
  "NEXT_PUBLIC_STELLAR_RPC_URL",
  "NEXT_PUBLIC_HORIZON_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_BACKEND_URL",
  "NEXT_PUBLIC_WS_URL",
  "NEXT_PUBLIC_WEBSOCKET_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
]);

const ALLOWED_CONNECT_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

const PERMISSIONS_POLICY_DIRECTIVES = Object.freeze([
  "accelerometer=()",
  "autoplay=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "gyroscope=()",
  "hid=()",
  "idle-detection=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "serial=()",
  "usb=()",
]);

/**
 * Extracts a normalized scheme + host (+ optional port) origin from a URL or
 * DSN string, stripping credentials, paths, query parameters, and fragments.
 * Returns null for empty, malformed, or non-HTTP/WebSocket inputs.
 *
 * @param {string | undefined} rawValue
 * @returns {string | null}
 */
function parseConnectOrigin(rawValue) {
  const trimmed = rawValue?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_CONNECT_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    if (!parsed.host) {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * Collects unique `connect-src` sources from defaults and configured
 * environment variables without throwing on invalid input.
 *
 * @param {HeaderEnvironment} [env]
 * @returns {string[]}
 */
function resolveConnectSources(env = process.env) {
  /** @type {Set<string>} */
  const sources = new Set([
    "'self'",
    "data:",
    "blob:",
    ...DEFAULT_STELLAR_CONNECT_ORIGINS,
    ...DEFAULT_SENTRY_CONNECT_ORIGINS,
  ]);

  for (const key of ENV_CONNECT_KEYS) {
    const origin = parseConnectOrigin(env[key]);
    if (origin) {
      sources.add(origin);
    }
  }

  const extraConnectList = env.NEXT_PUBLIC_CSP_CONNECT_SRC?.trim();
  if (extraConnectList) {
    for (const token of extraConnectList.split(/[\s,]+/)) {
      const origin = parseConnectOrigin(token);
      if (origin) {
        sources.add(origin);
      }
    }
  }

  if (env.NODE_ENV === "development") {
    sources.add("http://localhost:*");
    sources.add("http://127.0.0.1:*");
    sources.add("ws://localhost:*");
    sources.add("ws://127.0.0.1:*");
  }

  return Array.from(sources);
}

/**
 * Builds the `Content-Security-Policy` header value for StellarSwipe.
 *
 * @param {HeaderEnvironment} [env]
 * @returns {string}
 */
function buildContentSecurityPolicy(env = process.env) {
  const isDevelopment = env.NODE_ENV === "development";
  const scriptSources = isDevelopment
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", "'unsafe-inline'"];

  /** @type {Array<[string, readonly string[]]>} */
  const directives = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSources],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", resolveConnectSources(env)],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["media-src", ["'self'"]],
    ["frame-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];

  return directives
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Builds the full set of HTTP security response headers applied across routes.
 *
 * @param {HeaderEnvironment} [env]
 * @returns {SecurityHeader[]}
 */
function buildSecurityHeaders(env = process.env) {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(env),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: PERMISSIONS_POLICY_DIRECTIVES.join(", "),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
  ];
}

module.exports = {
  DEFAULT_STELLAR_CONNECT_ORIGINS,
  DEFAULT_SENTRY_CONNECT_ORIGINS,
  PERMISSIONS_POLICY_DIRECTIVES,
  parseConnectOrigin,
  resolveConnectSources,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
};
