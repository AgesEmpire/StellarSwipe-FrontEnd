/**
 * MSW server for Jest (Node.js) test environment.
 *
 * Import this in tests that need network mocking:
 *   import { server } from '@/src/mocks/server';
 *
 * The server is started/reset/closed automatically when you import it via
 * the jest.setup.ts setupFilesAfterFramework entry — no manual lifecycle
 * calls needed in individual test files.
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
