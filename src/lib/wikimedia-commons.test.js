import { describe, expect, it, vi, beforeEach } from "vitest";
import { searchImages } from "./wikimedia-commons.js";

const mockApiResponse = {
  query: {
    pages: {
      "12345": {
        title: "File:Sunset.jpg",
        imageinfo: [
          {
            thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/sunset.jpg",
            url: "https://upload.wikimedia.org/wikipedia/commons/sunset.jpg",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Sunset.jpg",
            width: 800,
            height: 600,
            mime: "image/jpeg",
          },
        ],
      },
    },
  },
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchImages", () => {
  it("returns image result on successful API response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result = await searchImages({ query: "sunset" });

    expect(result).not.toBeNull();
    expect(result.title).toBe("File:Sunset.jpg");
    expect(result.thumbUrl).toContain("upload.wikimedia.org");
    expect(result.fullUrl).toContain("sunset.jpg");
    expect(result.descriptionUrl).toContain("File:Sunset.jpg");
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.mime).toBe("image/jpeg");

    expect(fetch).toHaveBeenCalledTimes(1);
    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain("commons.wikimedia.org/w/api.php");
    expect(callUrl).toContain("gsrsearch=sunset");
    expect(callUrl).toContain("origin=*");
  });

  it("returns null on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
    });

    const result = await searchImages({ query: "nonexistent" });
    expect(result).toBeNull();
  });

  it("returns null when no pages in response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ query: { pages: {} } }),
    });

    const result = await searchImages({ query: "zzzznothing" });
    expect(result).toBeNull();
  });

  it("returns null when query result has no pages key", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await searchImages({ query: "nothing" });
    expect(result).toBeNull();
  });

  it("returns null when imageinfo has no thumburl", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        query: {
          pages: {
            "1": { title: "File:NoThumb.pdf", imageinfo: [{}] },
          },
        },
      }),
    });

    const result = await searchImages({ query: "nothumb" });
    expect(result).toBeNull();
  });

  it("returns null when imageinfo is missing", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        query: {
          pages: {
            "1": { title: "File:NoInfo.pdf" },
          },
        },
      }),
    });

    const result = await searchImages({ query: "noinfo" });
    expect(result).toBeNull();
  });

  it("uses cached result on subsequent call with same params", async () => {
    const query = "cache-specific-test-" + Date.now();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result1 = await searchImages({ query });
    const result2 = await searchImages({ query });

    expect(result1).toEqual(result2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("makes new request for different query", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "first-query-" + Date.now() });
    await searchImages({ query: "second-query-" + Date.now() });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("passes filetype as filemime when contains slash", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "cat", filetype: "image/png" });

    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain('filemime%3A%22image%2Fpng%22');
  });

  it("passes filetype as filetype: when no slash", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "cat", filetype: "bitmap" });

    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain('filetype%3Abitmap');
  });

  it("adds intitle prefix when intitle is true", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "sunset", intitle: "true" });

    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain("gsrsearch=intitle%3Asunset");
  });

  it("adds incategory when category is provided", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "landscape", category: "Nature" });

    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain('incategory%3A%22Nature%22');
  });

  it("always uses gsrlimit=1 (single image result)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "test", count: 100 });
    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain("gsrlimit=1");
  });

  it("clamps width to minimum of 50", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "test", width: 10 });
    const callUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(callUrl).toContain("iiurlwidth=50");
  });

  it("returns null when fetch throws (network error)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network failure"));

    const result = await searchImages({ query: "anything" });
    expect(result).toBeNull();
  });

  it("sends User-Agent header", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await searchImages({ query: "test" });

    expect(vi.mocked(fetch).mock.calls[0][1].headers["User-Agent"]).toBe("BetterDeepSeek/1.0");
  });
});
