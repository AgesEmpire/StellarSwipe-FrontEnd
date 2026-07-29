/**
 * Unit tests for the signal feed fetch timeout/abort handling (Issue #440).
 *
 * Mirrors `fetchLiveSignals`'s abort logic without needing a full
 * QueryClientProvider render, consistent with the pure-logic test style
 * used elsewhere in `hooks/__tests__`.
 */

import { TimeoutError, NetworkError } from "@/lib/api";

const SIGNALS_FETCH_TIMEOUT_MS = 12_000;

/** Mirrors the fetch/AbortController wiring in useSignalsFeed's fetchLiveSignals. */
async function fetchWithTimeout(
  fetchImpl: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  timeoutMs: number = SIGNALS_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl("/api/signals", { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(timeoutMs);
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

describe("useSignalsFeed – fetch timeout handling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws a TimeoutError when the fetch hangs past the configured window", async () => {
    const hungFetch = jest.fn(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new DOMException("Aborted", "AbortError");
            reject(err);
          });
        })
    );

    const pending = fetchWithTimeout(hungFetch, SIGNALS_FETCH_TIMEOUT_MS);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);

    await jest.advanceTimersByTimeAsync(SIGNALS_FETCH_TIMEOUT_MS);
    await assertion;
  });

  it("does not time out a fetch that resolves before the window elapses", async () => {
    const okResponse = { ok: true } as Response;
    const fastFetch = jest.fn(() => Promise.resolve(okResponse));

    const result = await fetchWithTimeout(fastFetch, SIGNALS_FETCH_TIMEOUT_MS);

    expect(result).toBe(okResponse);
  });

  it("surfaces a NetworkError (not TimeoutError) for non-abort fetch failures", async () => {
    const failingFetch = jest.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(fetchWithTimeout(failingFetch, SIGNALS_FETCH_TIMEOUT_MS)).rejects.toBeInstanceOf(
      NetworkError
    );
  });
});
