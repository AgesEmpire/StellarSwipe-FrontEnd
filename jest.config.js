/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx|js|mjs)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  // Accessibility tests that render components need jsdom — use
  // @jest-environment jsdom at the top of those files to opt in per-file.
  // MSW lifecycle (listen/reset/close) is wired up for all tests below.
  setupFilesAfterEnv: ["<rootDir>/src/mocks/jest.setup.ts"],
  // Allow Jest to transform MSW and @mswjs ESM packages
  transformIgnorePatterns: ["node_modules/(?!(msw|@mswjs)/)"],
  // Coverage configuration — used only by the test:coverage script.
  // Thresholds are set conservatively so existing code passes;
  // raise them as coverage improves.
  collectCoverage: false,
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.test.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/*.config.*",
    "!**/coverage/**",
    "!**/.next/**",
    "!**/out/**",
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
  coverageReporters: ["text-summary", "lcov", "text"],
};

module.exports = config;
