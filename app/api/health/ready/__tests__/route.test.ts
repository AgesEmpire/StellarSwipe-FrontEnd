import { GET } from "../route";

jest.mock("@/lib/dependencies", () => ({
  checkDependency: jest.fn(),
}));

import { checkDependency } from "@/lib/dependencies";

const mockedCheck = checkDependency as jest.MockedFunction<
  typeof checkDependency
>;

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports ready when all required dependencies are healthy", async () => {
    mockedCheck.mockResolvedValue({ healthy: true });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.dependencies.database.healthy).toBe(true);
  });

  it("reports unavailable when a required dependency is unhealthy", async () => {
    mockedCheck.mockImplementation(async (name: string) =>
      name === "database"
        ? { healthy: false, error: "connection refused" }
        : { healthy: true },
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unavailable");
    expect(body.dependencies.database.healthy).toBe(false);
  });

  it("does not block readiness when an optional dependency is unhealthy", async () => {
    mockedCheck.mockImplementation(async (name: string) =>
      name === "cache"
        ? { healthy: false, error: "cache down" }
        : { healthy: true },
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.dependencies.cache.healthy).toBe(false);
  });

  it("reports unavailable when a required dependency times out", async () => {
    mockedCheck.mockImplementation(async (name: string) => {
      if (name === "database") {
        throw new Error("timeout");
      }
      return { healthy: true };
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unavailable");
    expect(body.dependencies.database.healthy).toBe(false);
  });
});
