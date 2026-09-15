/**
 * Search Reader
 * Fetches search results via background script / Android bridge, parses the
 * HTML, and returns formatted markdown results. Supports optional deepFetch to
 * auto-read content from top N results.
 */

import { fetchAndConvertWebPage } from "./web-reader.js";
import { buildEffectiveSearchQuery, rankSearchResults, extractSearchSignals } from "./search-quality.js";

const DUCKDUCKGO_SEARCH_URL = "https://lite.duckduckgo.com/lite/?q=";
const DUCKDUCKGO_HTML_SEARCH_URL = "https://html.duckduckgo.com/html/?q=";
const BING_SEARCH_URL = "https://www.bing.com/search?q=";
const MAX_DEEP_FETCH = 5;

// Hard per-provider budget. A hanging provider (e.g. blocked or blackholed
// host) must fail fast so the chain can move on to the next provider (#148).
const SEARCH_PROVIDER_TIMEOUT_MS = 15_000;

// Prepended when only weak-relevance results could be recovered — tells the
// model to treat the evidence cautiously instead of citing it as fact (#148).
const LOW_CONFIDENCE_NOTICE =
  "> ⚠️ Low-confidence results: no search provider returned strongly relevant matches. Verify before citing.";

const SEARCH_FETCH_OPTIONS = {
  method: "GET",
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache, no-store",
    Pragma: "no-cache",
  },
  cache: "no-store",
  credentials: "omit",
  redirect: "follow",
  timeoutMs: SEARCH_PROVIDER_TIMEOUT_MS,
};

const SEARCH_PROVIDERS = [
  {
    id: "ddg-lite",
    name: "DuckDuckGo Lite",
    url: (query) => DUCKDUCKGO_SEARCH_URL + encodeURIComponent(query),
    parse: parseDuckDuckGoSearchResults,
  },
  {
    id: "ddg-html",
    name: "DuckDuckGo HTML",
    url: (query) => DUCKDUCKGO_HTML_SEARCH_URL + encodeURIComponent(query),
    parse: parseDuckDuckGoSearchResults,
  },
  {
    id: "bing",
    name: "Bing",
    url: (query) => BING_SEARCH_URL + encodeURIComponent(query),
    parse: parseBingSearchResults,
  },
];

/**
 * i18n keys for provider labels, kept explicit so code ids (kebab-case) and
 * locale keys (camelCase) can't drift apart again.
 */
const PROVIDER_LABEL_KEYS = {
  "ddg-lite": "settings.searchProvider.ddgLite",
  "ddg-html": "settings.searchProvider.ddgHtml",
  "bing": "settings.searchProvider.bing",
};

/** Canonical id+label list for settings UI rendering (all providers, any state). */
export const SEARCH_PROVIDER_CATALOG = SEARCH_PROVIDERS.map(({ id, name }) => ({
  id,
  name,
  labelKey: PROVIDER_LABEL_KEYS[id],
}));

/**
 * Resolve a user-configured provider order into an active provider list.
 *
 * Unknown ids are dropped, duplicates are removed, and a missing or fully
 * invalid list falls back to the default order. Disabled providers stay
 * disabled — the returned list is used verbatim by searchWeb.
 */
export function resolveSearchProviders(preferred) {
  if (!Array.isArray(preferred)) return [...SEARCH_PROVIDERS];
  const byId = new Map(SEARCH_PROVIDERS.map((provider) => [provider.id, provider]));
  const seen = new Set();
  const resolved = [];
  for (const raw of preferred) {
    const provider = byId.get(String(raw));
    if (provider && !seen.has(provider.id)) {
      resolved.push(provider);
      seen.add(provider.id);
    }
  }
  return resolved.length > 0 ? resolved : [...SEARCH_PROVIDERS];
}

function cleanSearchText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract the actual destination URL from a DDG click-track redirect link.
 * DDG wraps real URLs in: //duckduckgo.com/l/?uddg=<encoded_url>&rut=...
 */
function extractUrlFromDdgLink(href) {
  if (!href) return "";
  try {
    const normalizedHref = href.startsWith("//")
      ? "https:" + href
      : href.startsWith("/")
        ? "https://duckduckgo.com" + href
        : href;
    const url = new URL(normalizedHref);
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : href;
  } catch {
    return href;
  }
}

function decodeBase64Url(value) {
  if (!value) return "";

  try {
    const normalized = value
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary =
      typeof atob === "function"
        ? atob(normalized)
        : typeof Buffer !== "undefined"
          ? Buffer.from(normalized, "base64").toString("binary")
          : "";
    if (!binary) return "";

    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/**
 * Extract the actual destination URL from a Bing click-track redirect link.
 * Bing wraps URLs in /ck/a?...&u=a1<base64url(destination)>&...
 */
function extractUrlFromBingLink(href) {
  if (!href) return "";

  try {
    const url = new URL(href, "https://www.bing.com");
    const wrapped = url.searchParams.get("u");

    if (wrapped) {
      const decodedParam = decodeURIComponent(wrapped);
      const candidates = [
        decodedParam,
        decodedParam.startsWith("a1") || decodedParam.startsWith("a2")
          ? decodedParam.slice(2)
          : "",
      ];

      for (const candidate of candidates) {
        if (isHttpUrl(candidate)) return candidate;

        const decodedUrl = decodeBase64Url(candidate);
        if (isHttpUrl(decodedUrl)) return decodedUrl;
      }
    }

    if (url.hostname.endsWith("bing.com") && url.pathname.startsWith("/ck/")) {
      return "";
    }

    return isHttpUrl(url.toString()) ? url.toString() : href;
  } catch {
    return href;
  }
}

/**
 * Parse DuckDuckGo Lite / HTML result pages.
 *
 * DDG Lite currently uses simple table rows:
 *   <tr>
 *     <td valign="top">1.&nbsp;</td>
 *     <td><a class="result-link" href="//duckduckgo.com/l/?uddg=...">Title</a></td>
 *   </tr>
 *   <tr>
 *     <td>&nbsp;&nbsp;&nbsp;</td>
 *     <td class="result-snippet">Snippet text</td>
 *   </tr>
 *   <tr>
 *     <td>&nbsp;&nbsp;&nbsp;</td>
 *     <td><span class="link-text">example.com/page</span></td>
 *   </tr>
 *
 * DDG HTML can instead use block results:
 *   <div class="result">
 *     <a class="result__a" href="/l/?uddg=...">Title</a>
 *     <a class="result__snippet">Snippet text</a>
 *   </div>
 */
function parseDuckDuckGoSearchResults(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const links = doc.querySelectorAll("a.result-link, a.result__a");
  const results = [];

  for (const link of links) {
    const title = cleanSearchText(link.textContent);
    const rawHref = link.getAttribute("href") || "";
    const url = extractUrlFromDdgLink(rawHref);
    if (!title || !isHttpUrl(url)) continue;

    let snippet = "";
    const resultContainer = link.closest(".result");

    if (resultContainer) {
      snippet = cleanSearchText(resultContainer.querySelector(".result__snippet")?.textContent);
    } else {
      const linkRow = link.closest("tr");
      if (!linkRow) continue;

      const nextRow = linkRow.nextElementSibling;
      const snippetEl = nextRow?.querySelector(".result-snippet");
      snippet = cleanSearchText(snippetEl?.textContent);
    }

    results.push({ title, url, snippet });
  }

  return results;
}

/**
 * Parse Bing HTML result pages used as a fallback when DuckDuckGo returns its
 * Android/OkHttp anomaly page.
 *
 * Bing organic results are list items:
 *   <li class="b_algo">
 *     <h2><a href="https://www.bing.com/ck/a?...&u=a1BASE64URL...">Title</a></h2>
 *     <div class="b_caption"><p>Snippet text</p></div>
 *   </li>
 *
 * The direct destination is stored in the `u` query parameter. Bing prefixes
 * the base64url payload with `a1` / `a2`, so extractUrlFromBingLink strips that
 * marker and decodes the URL before deep-fetch uses it.
 */
function parseBingSearchResults(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const results = [];
  const seenUrls = new Set();

  for (const item of doc.querySelectorAll("li.b_algo")) {
    const link = item.querySelector("h2 a[href]");
    if (!link) continue;

    const title = cleanSearchText(link.textContent);
    const url = extractUrlFromBingLink(link.getAttribute("href") || "");
    if (!title || !isHttpUrl(url) || seenUrls.has(url)) continue;

    const snippet = cleanSearchText(
      item.querySelector(".b_caption p, .b_snippet, .b_lineclamp2, p")?.textContent
    );

    seenUrls.add(url);
    results.push({ title, url, snippet });
  }

  return results;
}

function parseSearchResults(html) {
  const duckDuckGoResults = parseDuckDuckGoSearchResults(html);
  return duckDuckGoResults.length > 0 ? duckDuckGoResults : parseBingSearchResults(html);
}

function isSearchChallengePage(html, status) {
  if (Number(status) === 202) return true;

  const content = String(html || "");
  if (/result-link|result__a|b_algo/.test(content)) return false;

  return /anomaly|captcha|unusual traffic|verify you are human|robot|bot detection/i.test(content);
}

function searchFailureMessage(errors) {
  const messages = errors.map((error) => error.replace(/^[^:]+:\s*/, ""));
  const uniqueMessages = [...new Set(messages)];
  return uniqueMessages.length === 1
    ? `Search failed: ${uniqueMessages[0]}`
    : `Search failed: ${errors.join("; ")}`;
}

/**
 * Format search results as a markdown document.
 */
function formatSearchResults(query, results, provider = "DuckDuckGo Lite") {
  const lines = [];
  lines.push(`# Search Results: ${query}`);
  lines.push("");
  lines.push(`> ${results.length} results found via ${provider}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  results.forEach((result, index) => {
    const rank = index + 1;
    lines.push(`## ${rank}. ${result.title}`);
    lines.push("");
    lines.push(`> ${result.snippet}`);
    lines.push("");
    lines.push(`**URL:** ${result.url}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Format deep-fetched page content as an appendix.
 */
function formatDeepFetchContent(title, url, markdown) {
  const lines = [];
  lines.push("");
  lines.push("=".repeat(64));
  lines.push(`## Page Content: ${title}`);
  lines.push(`**Source:** ${url}`);
  lines.push("=".repeat(64));
  lines.push("");
  lines.push(markdown);
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

/**
 * Search the web.
 *
 * @param {string} query - Search query
 * @param {number} [deepFetch=0] - Number of top results to also fetch full content for
 * @param {(status: string, info?: { phase: string, provider?: string }) => void} [onStatus] - Optional status callback
 * @typedef {{
 *   purpose?: string,
 *   sourceType?: "general"|"docs"|"news"|"reviews"|"academic"|"commerce",
 *   providers?: string[]
 * }} SearchOptions
 * @param {SearchOptions} [options] - Optional query shaping, ranking hints and
 *   user-configured provider ids (see resolveSearchProviders)
 * @returns {Promise<{file: File, results: Array<{title: string, url: string, snippet: string}>, query: string, deepFetch: number, provider: string, effectiveQuery?: string, rawResultCount: number}>}
 */
export {
  parseSearchResults,
  formatSearchResults,
  formatDeepFetchContent,
  extractUrlFromDdgLink,
  extractUrlFromBingLink,
};

export async function searchWeb(query, deepFetch = 0, onStatus = () => {}, options = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    throw new Error("Search query is empty.");
  }

  const safeDeepFetch = Math.max(0, Math.min(MAX_DEEP_FETCH, Number(deepFetch) || 0));
  const { normalizedQuery, effectiveQuery } = buildEffectiveSearchQuery(trimmedQuery, options);
  const providerQuery = effectiveQuery || normalizedQuery;

  // Detect positive site: constraints for error messaging
  const signals = extractSearchSignals(providerQuery);
  const hasSiteConstraint = signals.includeSites.length > 0;
  const siteDomains = hasSiteConstraint ? signals.includeSites.join(", ") : "";

  // Provider order is user-configured (settings.searchProviders); callers pass
  // the resolved list. Falls back to the default order when not provided.
  const activeProviders = resolveSearchProviders(options.providers);

  let providerName = "";
  let results = [];
  let rawResultCount = 0;
  const errors = [];
  let bestWeakResult = null;

  for (const provider of activeProviders) {
    onStatus(`Searching ${provider.name}...`, { phase: "searching", provider: provider.name });

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: "bds-fetch-url",
        url: provider.url(providerQuery),
        options: SEARCH_FETCH_OPTIONS,
      });
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
      continue;
    }

    if (!response || !response.ok) {
      errors.push(`${provider.name}: ${response?.error || "Search request failed."}`);
      continue;
    }

    onStatus(`Parsing ${provider.name} results...`, { phase: "parsing", provider: provider.name });
    const parsedResults = provider.parse(response.html || "");
    if (parsedResults.length > 0) {
      const rankedResults = rankSearchResults(trimmedQuery, parsedResults, options);
      if (
        !bestWeakResult ||
        rankedResults.topScore > bestWeakResult.topScore ||
        (rankedResults.topScore === bestWeakResult.topScore &&
          rankedResults.results.length > bestWeakResult.results.length)
      ) {
        bestWeakResult = {
          providerName: provider.name,
          results: rankedResults.results,
          rawResultCount: rankedResults.rawResultCount,
          topScore: rankedResults.topScore,
        };
      }

      if (rankedResults.results.length === 0) {
        errors.push(`${provider.name}: no qualifying results`);
        continue;
      }

      if (rankedResults.passingCount >= 3 || rankedResults.isStrongTopResult) {
        providerName = provider.name;
        results = rankedResults.results;
        rawResultCount = rankedResults.rawResultCount;
        break;
      }

      errors.push(`${provider.name}: weak relevance`);
      continue;
    }

    errors.push(
      `${provider.name}: ${
        isSearchChallengePage(response.html, response.status)
          ? "search provider returned an anti-bot challenge"
          : "no results"
      }`
    );
  }

  let usedWeakFallback = false;
  if (results.length === 0 && bestWeakResult?.results?.length > 0) {
    usedWeakFallback = true;
    providerName = bestWeakResult.providerName;
    results = bestWeakResult.results;
    rawResultCount = bestWeakResult.rawResultCount;
  }

  if (results.length === 0) {
    const onlyNoResults =
      errors.length > 0 &&
      errors.every((error) => /: no (results|qualifying results)$/.test(error));
    if (onlyNoResults) {
      if (hasSiteConstraint) {
        throw new Error(`No search results found for site: ${siteDomains}.`);
      }
      throw new Error("No search results found for query: " + trimmedQuery);
    }
    throw new Error(searchFailureMessage(errors));
  }

  let output = formatSearchResults(trimmedQuery, results, providerName);
  if (usedWeakFallback) {
    output = LOW_CONFIDENCE_NOTICE + "\n\n" + output;
  }

  if (safeDeepFetch > 0) {
    onStatus(`Fetching content from top ${safeDeepFetch} results...`, { phase: "deep-fetch" });
    const urlsToFetch = results.slice(0, safeDeepFetch);

    for (let i = 0; i < urlsToFetch.length; i++) {
      const result = urlsToFetch[i];
      try {
        onStatus(`Reading page ${i + 1}/${safeDeepFetch}: ${result.title}`);
        const file = await fetchAndConvertWebPage(result.url, () => {});
        const markdown = await file.text();
        output += formatDeepFetchContent(result.title, result.url, markdown);
      } catch (err) {
        output += formatDeepFetchContent(
          result.title,
          result.url,
          `*(Failed to fetch page content: ${err.message})*`
        );
      }
    }
  }

  onStatus("Creating file...", { phase: "finalize" });
  const blob = new Blob([output], { type: "text/markdown" });
  const safeFilename =
    trimmedQuery
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 50) + "-search.md";

  const file = new File([blob], safeFilename, { type: "text/markdown" });
  return {
    file,
    results,
    query: trimmedQuery,
    deepFetch: safeDeepFetch,
    provider: providerName,
    effectiveQuery,
    rawResultCount: rawResultCount || results.length,
    lowConfidence: usedWeakFallback,
  };
}
