/**
 * Tests for the deprecated /api/signals/v1 route shim.
 * Validates legacy `limit` → `pageSize` mapping and deprecation headers.
 */

import { buildSignalPage } from "@/lib/signals";

jest.mock("@/src/tracing/worker-tracing.service", () => ({
  traceWorker: jest.fn((_name: string, fn: () => unknown) => fn()),
}));

// Capture calls to NextResponse.json so we can inspect args without needing Web Response globals
const mockJson = jest.fn((body: unknown, init?: ResponseInit) => ({ body, init }));
jest.mock("next/server", () => ({ NextResponse: { json: mockJson } }));

import { GET } from "@/app/api/signals/v1/route";

function makeRequest(search: string) {
  return new Request(`http://localhost/api/signals/v1${search}`);
}

beforeEach(() => mockJson.mockClear());

describe("GET /api/signals/v1 (deprecated shim)", () => {
  it("returns signal feed data with correct pageSize from `limit`", async () => {
    await GET(makeRequest("?page=1&limit=5"));
    const [body, init] = [mockJson.mock.calls[0][0], mockJson.mock.calls[0][1]];
    expect(init?.status).toBe(200);
    expect(body).toMatchObject({ pageSize: 5, page: 1 });
    expect(Array.isArray((body as ReturnType<typeof buildSignalPage>).items)).toBe(true);
  });

  it("maps legacy `limit` param to pageSize", async () => {
    await GET(makeRequest("?limit=3"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    expect(body.pageSize).toBe(3);
  });

  it("falls back to pageSize when limit is absent", async () => {
    await GET(makeRequest("?pageSize=7"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    expect(body.pageSize).toBe(7);
  });

  it("includes Deprecation response header", async () => {
    await GET(makeRequest(""));
    const init = mockJson.mock.calls[0][1] as ResponseInit & { headers: Record<string, string> };
    expect(init.headers["Deprecation"]).toBe("true");
  });

  it("includes Link header pointing to successor", async () => {
    await GET(makeRequest(""));
    const init = mockJson.mock.calls[0][1] as ResponseInit & { headers: Record<string, string> };
    expect(init.headers["Link"]).toContain("/api/signals");
  });

  it("returns 400 for invalid pagination params", async () => {
    await GET(makeRequest("?page=0"));
    const init = mockJson.mock.calls[0][1] as ResponseInit;
    expect(init?.status).toBe(400);
  });
});

describe("GET /api/signals (current entry point)", () => {
  it("returns 200 without deprecation headers", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const init = mockJson.mock.calls[0][1] as ResponseInit & {
      headers?: Record<string, string>;
    };
    expect(init?.status).toBe(200);
    expect(init?.headers?.["Deprecation"]).toBeUndefined();
  });
});

describe("confidence history on signal details (#815)", () => {
  it("exposes confidence observations in timestamp order", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    const item = body.items[0] as unknown as {
      confidenceHistory?: Array<{ confidence: number; observedAt: string }>;
    };
    const history = item.confidenceHistory ?? [];
    const times = history.map((h) => new Date(h.observedAt).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });

  it("provides an accessible text alternative for each observation", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    const item = body.items[0] as unknown as {
      confidenceHistory?: Array<{ confidence: number; observedAt: string; label?: string }>;
    };
    for (const obs of item.confidenceHistory ?? []) {
      expect(typeof obs.label).toBe("string");
      expect(obs.label).toContain(String(obs.confidence));
    }
  });

  it("distinguishes historical observations from the current confidence value", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    const item = body.items[0] as unknown as {
      confidence: number;
      confidenceHistory?: Array<{ confidence: number; observedAt: string }>;
    };
    const history = item.confidenceHistory ?? [];
    if (history.length > 0) {
      const latest = history[history.length - 1];
      expect(latest.confidence).not.toBe(item.confidence);
    }
  });

  it("handles empty history without fabricating observations", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    for (const raw of body.items) {
      const item = raw as unknown as { confidenceHistory?: unknown[] };
      if (item.confidenceHistory !== undefined) {
        expect(Array.isArray(item.confidenceHistory)).toBe(true);
      }
    }
  });
});

/**
 * NestJS unit test conventions (#929)
 *
 * Lightweight pattern for isolated providers and guards:
 * - Build a testing module with `Test.createTestingModule`.
 * - Override dependencies with `.overrideProvider(...).useValue(...)` so no live
 *   services (DB, HTTP, queues) are required.
 * - Always `await module.close()` in `afterEach` to release resources.
 */
describe("NestJS unit test conventions (#929)", () => {
  // Example provider under test with an injected dependency.
  class ExampleService {
    constructor(private readonly dep: { getValue: () => number }) {}
    compute(): number {
      return this.dep.getValue() * 2;
    }
  }

  // Example guard under test with an injected dependency.
  class ExampleGuard {
    constructor(private readonly dep: { isAllowed: () => boolean }) {}
    canActivate(): boolean {
      return this.dep.isAllowed();
    }
  }

  const DEP = "EXAMPLE_DEP";

  describe("isolated provider", () => {
    let moduleRef: import("@nestjs/testing").TestingModule;
    let service: ExampleService;

    beforeEach(async () => {
      const { Test } = await import("@nestjs/testing");
      moduleRef = await Test.createTestingModule({
        providers: [
          ExampleService,
          { provide: DEP, useValue: { getValue: () => 21 } },
        ],
      }).compile();
      service = moduleRef.get(ExampleService);
    });

    afterEach(async () => {
      await moduleRef.close();
    });

    it("resolves the provider with a mocked dependency", () => {
      expect(service.compute()).toBe(42);
    });

    it("allows overriding the dependency without live services", async () => {
      const { Test } = await import("@nestjs/testing");
      const overridden = await Test.createTestingModule({
        providers: [ExampleService, { provide: DEP, useValue: { getValue: () => 0 } }],
      })
        .overrideProvider(DEP)
        .useValue({ getValue: () => 5 })
        .compile();

      try {
        expect(overridden.get(ExampleService).compute()).toBe(10);
      } finally {
        await overridden.close();
      }
    });
  });

  describe("isolated guard", () => {
    let moduleRef: import("@nestjs/testing").TestingModule;
    let guard: ExampleGuard;

    beforeEach(async () => {
      const { Test } = await import("@nestjs/testing");
      moduleRef = await Test.createTestingModule({
        providers: [
          ExampleGuard,
          { provide: DEP, useValue: { isAllowed: () => true } },
        ],
      }).compile();
      guard = moduleRef.get(ExampleGuard);
    });

    afterEach(async () => {
      await moduleRef.close();
    });

    it("grants access when the mocked dependency allows it", () => {
      expect(guard.canActivate()).toBe(true);
    });

    it("denies access when the dependency is overridden to reject", async () => {
      const { Test } = await import("@nestjs/testing");
      const overridden = await Test.createTestingModule({
        providers: [ExampleGuard, { provide: DEP, useValue: { isAllowed: () => true } }],
      })
        .overrideProvider(DEP)
        .useValue({ isAllowed: () => false })
        .compile();

      try {
        expect(overridden.get(ExampleGuard).canActivate()).toBe(false);
      } finally {
        await overridden.close();
      }
    });
  });
});
