import type { Config } from "jest";

const sharedConfig = {
  preset: "ts-jest",
  testEnvironment: "node" as const,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

const config: Config = {
  // Three projects:
  //   1. "unit"    — pure TypeScript tests with no MSW (poller, tracing, stores, etc.)
  //   2. "lib"     — lib/__tests__ tests that do NOT use MSW (e.g. signal payload)
  //   3. "network" — lib/__tests__ tests that DO use MSW for HTTP mocking
  //
  // The unit/lib split avoids the MSW ESM incompatibility surfacing in tests
  // that don't need network mocking at all.
  projects: [
    {
      ...sharedConfig,
      displayName: "unit",
      testMatch: [
        "<rootDir>/src/__tests__/**/*.test.ts",
        "<rootDir>/src/tracing/__tests__/**/*.test.ts",
        "<rootDir>/hooks/__tests__/**/*.test.ts",
        "<rootDir>/store/__tests__/**/*.test.ts",
        "<rootDir>/components/__tests__/**/*.test.{ts,tsx}",
        "<rootDir>/components/chart/__tests__/**/*.test.{ts,tsx}",
        "<rootDir>/services/performanceMonitoring/__tests__/**/*.test.ts",
      ],
      // No setupFilesAfterEnv — these tests never need MSW.
    },
    {
      ...sharedConfig,
      displayName: "lib",
      testMatch: [
        // Pure lib tests that do NOT require MSW (add new ones here)
        "<rootDir>/lib/__tests__/signalPayload.test.ts",
      ],
      // No setupFilesAfterEnv — no MSW needed.
    },
    {
      ...sharedConfig,
      displayName: "network",
      testMatch: [
        // lib tests that require MSW for HTTP mocking
        "<rootDir>/lib/__tests__/api.msw.test.ts",
      ],
      // MSW lifecycle for HTTP-mocked tests only.
      setupFilesAfterEnv: ["<rootDir>/src/mocks/jest.setup.ts"],
    },
  ],
};

export default config;
