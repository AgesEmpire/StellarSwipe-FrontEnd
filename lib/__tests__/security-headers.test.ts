import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_SENTRY_CONNECT_ORIGINS,
  DEFAULT_STELLAR_CONNECT_ORIGINS,
  PERMISSIONS_POLICY_DIRECTIVES,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  parseConnectOrigin,
  resolveConnectSources,
} from "../security-headers.js";

function parseCspDirectives(csp: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const rawDirective of csp.split(";")) {
    const trimmed = rawDirective.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    map[name] = values;
  }
  return map;
}

describe("parseConnectOrigin", () => {
  it("extracts normalized origins for http, https, ws, and wss URLs while stripping credentials, paths, and queries", () => {
    expect(
      parseConnectOrigin(
        "https://publicKey123@o450000.ingest.sentry.io/7890123?sample=1#frag",
      ),
    ).toBe("https://o450000.ingest.sentry.io");
    expect(
      parseConnectOrigin("https://rpc.mainnet.stellarswipe.io:8443/soroban/v1"),
    ).toBe("https://rpc.mainnet.stellarswipe.io:8443");
    expect(
      parseConnectOrigin("wss://stream.stellarswipe.io/quotes?pair=XLM-USDC"),
    ).toBe("wss://stream.stellarswipe.io");
    expect(parseConnectOrigin("ws://localhost:4001/ws")).toBe(
      "ws://localhost:4001",
    );
  });

  it("returns null for empty, malformed, or unsupported-protocol inputs", () => {
    expect(parseConnectOrigin(undefined)).toBeNull();
    expect(parseConnectOrigin("")).toBeNull();
    expect(parseConnectOrigin("   ")).toBeNull();
    expect(parseConnectOrigin("not-a-valid-url")).toBeNull();
    expect(parseConnectOrigin("javascript:alert(1)")).toBeNull();
    expect(parseConnectOrigin("ftp://files.example.com/pub")).toBeNull();
  });
});

describe("resolveConnectSources & buildContentSecurityPolicy", () => {
  it("scopes production CSP directives to self, Stellar Horizon/Soroban RPC, Sentry, workers, and chart rendering without unsafe-eval", () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: "production",
    });
    const directives = parseCspDirectives(csp);

    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directives["script-src"]).not.toContain("'unsafe-eval'");
    expect(directives["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directives["img-src"]).toEqual(["'self'", "data:", "blob:", "https:"]);
    expect(directives["font-src"]).toEqual(["'self'", "data:"]);
    expect(directives["worker-src"]).toEqual(["'self'", "blob:"]);
    expect(directives["manifest-src"]).toEqual(["'self'"]);
    expect(directives["media-src"]).toEqual(["'self'"]);
    expect(directives["frame-src"]).toEqual(["'self'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);

    for (const origin of [
      "'self'",
      "data:",
      "blob:",
      ...DEFAULT_STELLAR_CONNECT_ORIGINS,
      ...DEFAULT_SENTRY_CONNECT_ORIGINS,
    ]) {
      expect(directives["connect-src"]).toContain(origin);
    }
  });

  it("includes dynamic Sentry DSN, Soroban/Horizon RPC, API, and WebSocket origins with deduplication and safe fallback on invalid env values", () => {
    const sources = resolveConnectSources({
      NODE_ENV: "production",
      NEXT_PUBLIC_SENTRY_DSN:
        "https://abc123secretKey@sentry.stellarswipe.example/99",
      NEXT_PUBLIC_SOROBAN_RPC_URL: "https://mainnet.sorobanrpc.example/rpc",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon.stellar.org/accounts",
      NEXT_PUBLIC_WS_URL: "wss://quotes.stellarswipe.example/v1/stream",
      NEXT_PUBLIC_API_URL: "  not a url  ",
      NEXT_PUBLIC_CSP_CONNECT_SRC:
        "https://analytics.stellarswipe.example/collect, wss://quotes.stellarswipe.example/dup javascript:bad",
    });

    expect(sources).toContain("https://sentry.stellarswipe.example");
    expect(sources.join(" ")).not.toContain("abc123secretKey");
    expect(sources).toContain("https://mainnet.sorobanrpc.example");
    expect(sources).toContain("wss://quotes.stellarswipe.example");
    expect(sources).toContain("https://analytics.stellarswipe.example");

    const uniqueCount = new Set(sources).size;
    expect(sources).toHaveLength(uniqueCount);
  });

  it("adds localhost HMR WebSocket sources and unsafe-eval only in development", () => {
    const devDirectives = parseCspDirectives(
      buildContentSecurityPolicy({ NODE_ENV: "development" }),
    );

    expect(devDirectives["script-src"]).toContain("'unsafe-eval'");
    expect(devDirectives["connect-src"]).toContain("ws://localhost:*");
    expect(devDirectives["connect-src"]).toContain("http://localhost:*");
  });
});

describe("buildSecurityHeaders & next.config.mjs headers()", () => {
  it("returns CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, and X-Content-Type-Options", () => {
    const headers = buildSecurityHeaders({ NODE_ENV: "production" });
    const headerMap = Object.fromEntries(
      headers.map((header) => [header.key, header.value]),
    );

    expect(headerMap["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headerMap["X-Frame-Options"]).toBe("DENY");
    expect(headerMap["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headerMap["X-Content-Type-Options"]).toBe("nosniff");

    for (const directive of PERMISSIONS_POLICY_DIRECTIVES) {
      expect(headerMap["Permissions-Policy"]).toContain(directive);
    }
    expect(headerMap["Permissions-Policy"]).toContain("camera=()");
    expect(headerMap["Permissions-Policy"]).toContain("microphone=()");
    expect(headerMap["Permissions-Policy"]).toContain("geolocation=()");
    expect(headerMap["Permissions-Policy"]).not.toContain("clipboard-write=()");
  });

  it("exposes an async headers() function on next.config.mjs covering all application routes", () => {
    const stdout = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'const mod = await import("./next.config.mjs"); const rules = await mod.default.headers(); process.stdout.write(JSON.stringify(rules));',
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_ENV: "production",
          NEXT_PUBLIC_SOROBAN_RPC_URL: "https://custom-soroban.example/rpc",
        },
      },
    );

    const routeRules = JSON.parse(stdout) as Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;

    expect(Array.isArray(routeRules)).toBe(true);
    const wildcardRule = routeRules.find((rule) => rule.source === "/:path*");
    expect(wildcardRule).toBeDefined();

    const headerMap = Object.fromEntries(
      wildcardRule!.headers.map((header) => [header.key, header.value]),
    );
    expect(headerMap["X-Frame-Options"]).toBe("DENY");
    expect(headerMap["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headerMap["X-Content-Type-Options"]).toBe("nosniff");
    expect(headerMap["Permissions-Policy"]).toContain("camera=()");
    expect(headerMap["Content-Security-Policy"]).toContain(
      "https://custom-soroban.example",
    );
  });

  it("preserves compatibility for Sentry replay workers, service worker push sync, chart exports, and vercel.json", () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: "production",
      SENTRY_DSN: "https://serverKey@o100.ingest.de.sentry.io/12",
      NEXT_PUBLIC_BACKEND_URL: "https://api.stellarswipe.example/v1",
      NEXT_PUBLIC_WEBSOCKET_URL: "wss://realtime.stellarswipe.example/socket",
    });
    const directives = parseCspDirectives(csp);

    // Service worker (/sw.js) + Sentry replayIntegration compression blob worker
    expect(directives["worker-src"]).toEqual(["'self'", "blob:"]);
    // html2canvas offscreen clone + PnLShareCardGenerator data/blob fetch
    expect(directives["frame-src"]).toContain("'self'");
    expect(directives["img-src"]).toEqual(
      expect.arrayContaining(["'self'", "data:", "blob:", "https:"]),
    );
    expect(directives["connect-src"]).toEqual(
      expect.arrayContaining([
        "'self'",
        "data:",
        "blob:",
        "https://o100.ingest.de.sentry.io",
        "https://api.stellarswipe.example",
        "wss://realtime.stellarswipe.example",
      ]),
    );
    expect(csp).not.toContain("serverKey");

    const vercelConfig = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(vercelConfig.headers).toBeUndefined();
  });
});
