// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("youtube-transcript", () => ({
  fetchTranscript: vi.fn(),
}));

import { fetchPageContent } from "../../src/background/index.js";

function hangingFetch() {
  return vi.fn(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      })
  );
}

describe("fetchPageContent timeoutMs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts and rejects with a friendly message when the request exceeds timeoutMs", async () => {
    vi.useFakeTimers();
    globalThis.fetch = hangingFetch();

    const pending = expect(
      fetchPageContent("https://example.com/slow", { timeoutMs: 5000 })
    ).rejects.toThrow("Request timed out after 5000ms");

    await vi.advanceTimersByTimeAsync(5001);
    await pending;
  });

  it("clears the timeout timer once the request completes", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async () => new Response("<html>ok</html>", { status: 200 }));

    const result = await fetchPageContent("https://example.com/", { timeoutMs: 15000 });

    expect(result.html).toContain("<html>");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes an AbortSignal to fetch when timeoutMs is set", async () => {
    globalThis.fetch = vi.fn(async () => new Response("<html></html>", { status: 200 }));

    await fetchPageContent("https://example.com/x", { timeoutMs: 15000 });

    const init = fetch.mock.calls[0][1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("does not pass a signal when timeoutMs is absent or invalid", async () => {
    globalThis.fetch = vi.fn(async () => new Response("<html></html>", { status: 200 }));

    await fetchPageContent("https://example.com/a", {});
    await fetchPageContent("https://example.com/b", { timeoutMs: -5 });
    await fetchPageContent("https://example.com/c", { timeoutMs: "nope" });

    for (let i = 0; i < 3; i++) {
      expect(fetch.mock.calls[i][1].signal).toBeUndefined();
    }
  });

  it("propagates non-abort errors unchanged", async () => {
    globalThis.fetch = vi.fn(async () => new Response("boom", { status: 503 }));

    await expect(fetchPageContent("https://example.com/down")).rejects.toThrow(
      "Server returned 503 for https://example.com/down"
    );
  });
});
