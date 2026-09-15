let cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE = 50;

export async function searchImages({ query, count = 1, width = 400, filetype, intitle, category, signal }) {
  const cacheKey = JSON.stringify({ query, count, width, filetype, intitle, category });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let searchQuery = query;
  if (intitle === "true") {
    searchQuery = `intitle:${query}`;
  }
  if (filetype) {
    searchQuery += filetype.includes("/") ? ` filemime:"${filetype}"` : ` filetype:${filetype}`;
  }
  if (category) {
    searchQuery += ` incategory:"${category}"`;
  }

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: searchQuery,
    gsrnamespace: "6",
    gsrlimit: "1",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: String(Math.max(50, Number(width) || 400)),
    format: "json",
    origin: "*",
  });

  const url = `https://commons.wikimedia.org/w/api.php?${params}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "BetterDeepSeek/1.0" },
      signal,
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = await response.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const pageIds = Object.keys(pages);
  if (!pageIds.length) return null;

  const first = pages[pageIds[0]];
  const info = first?.imageinfo?.[0];
  if (!info?.thumburl) return null;

  const result = {
    title: first.title,
    thumbUrl: info.thumburl,
    fullUrl: info.url,
    descriptionUrl: info.descriptionurl,
    displayUrl: info.thumburl,
    width: info.width,
    height: info.height,
    mime: info.mime,
  };

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, { ts: Date.now(), data: result });

  return result;
}
