/**
 * Tag Hider — strips <tag> suffixes from sidebar titles and BDS tags from popovers.
 *
 * Uses safeSetTextContent with MutationObserver paused so that DOM updates are
 * handled cleanly without triggering recursive scan cycles or observer churn.
 */

import state from "../state.js";
import {
  extractBaseTitle,
  discoverTags,
  extractSessionId,
  getCurrentSessionId,
} from "./tag-manager.js";
import { safeSetTextContent, safeSetAttribute, safeRemoveAttribute } from "../dom/dom-safety.js";

// Tag suffix pattern: one or more <word> at end of string
const TAG_SUFFIX_REGEX = /(\s+<[^<>]+>)+\s*$/;

/**
 * Process all visible sidebar titles and hide tag suffixes.
 * This is idempotent — safe to call repeatedly.
 */
export function hideTagsInSidebar() {
  const titleElements = document.querySelectorAll(".c08e6e93");

  for (const el of titleElements) {
    const liveText = el.textContent || "";
    const stored = el.getAttribute("data-bds-full-title");
    // If the live text matches the extracted base title from the stored full title,
    // it means BDS previously stripped the tags and DOM hasn't been renamed.
    // Otherwise, the element text was changed externally (e.g. chat rename).
    const fullText = stored && liveText === extractBaseTitle(stored) ? stored : liveText;

    // Discovery: if title has tags, ensure they are in our state
    const link = el.closest('a[href*="/chat/s/"]');
    if (link) {
      const sessionId = extractSessionId(link.href);
      if (sessionId) {
        discoverTags(sessionId, fullText);
      }
    }

    // Skip if no tags in the text
    if (!TAG_SUFFIX_REGEX.test(fullText)) {
      if (stored) {
        safeRemoveAttribute(el, "data-bds-full-title");
      }
      continue;
    }

    // Store the full title for later retrieval
    safeSetAttribute(el, "data-bds-full-title", fullText);

    // Replace visible text with base title only
    const baseTitle = extractBaseTitle(fullText);
    if (liveText !== baseTitle) {
      safeSetTextContent(el, baseTitle);
    }
  }
}

/**
 * Also hide tags from the main chat header area (the title shown
 * at the top of the current conversation).
 */
export function hideTagsInHeader() {
  const headerTitle = document.querySelector("._7436101");
  if (!headerTitle) return;

  const liveText = headerTitle.textContent || "";
  const stored = headerTitle.getAttribute("data-bds-full-title");
  const fullText = stored && liveText === extractBaseTitle(stored) ? stored : liveText;

  // Discovery for header title
  const sessionId = getCurrentSessionId();
  if (sessionId) {
    discoverTags(sessionId, fullText);
  }

  if (!TAG_SUFFIX_REGEX.test(fullText)) {
    if (stored) {
      safeRemoveAttribute(headerTitle, "data-bds-full-title");
    }
    return;
  }

  safeSetAttribute(headerTitle, "data-bds-full-title", fullText);
  const baseTitle = extractBaseTitle(fullText);
  if (liveText !== baseTitle) {
    safeSetTextContent(headerTitle, baseTitle);
  }
}

/**
 * Clean <BetterDeepSeek> and <BDS:...> tags from strings (handles raw and HTML-encoded forms).
 */
export function cleanBdsString(text) {
  if (!text) return "";
  let s = String(text);

  // 1. Full/Closed <BetterDeepSeek>...</BetterDeepSeek> or <BDS:...>...</BDS:...>
  s = s.replace(/(?:<|&lt;)BetterDeepSeek(?:>|&gt;)[\s\S]*?(?:<|&lt;)\/BetterDeepSeek(?:>|&gt;)/gi, "");
  s = s.replace(/(?:<|&lt;)BDS:([A-Za-z0-9_:]+)[^>&]*?(?:>|&gt;)[\s\S]*?(?:<|&lt;)\/BDS:\1(?:>|&gt;)/gi, "");

  // 2. Unclosed <BetterDeepSeek>... or <BDS:...>... (e.g. truncated preview strings)
  s = s.replace(/(?:<|&lt;)BetterDeepSeek(?:>|&gt;)[\s\S]*/gi, "");
  s = s.replace(/(?:<|&lt;)BDS:[A-Za-z0-9_:]+[^>&]*?(?:>|&gt;)[\s\S]*/gi, "");

  // 3. Any stray closing or opening tags
  s = s.replace(/(?:<|&lt;)\/?BetterDeepSeek(?:>|&gt;)/gi, "");
  s = s.replace(/(?:<|&lt;)\/?BDS:[A-Za-z0-9_:]+[^>&]*?(?:>|&gt;)/gi, "");

  return s.trim();
}

/**
 * Scan DOM for popovers, virtual lists, version history items, and message summaries,
 * stripping <BetterDeepSeek> and <BDS:...> tags so they are invisible to users.
 */
export function hideBdsTagsInPopovers() {
  const candidates = document.querySelectorAll(
    '._72b6158, .ds-virtual-list-visible-items div, .ds-popover div, .ds-dropdown div, [class*="version"], [class*="branch"], [class*="history"], [class*="summary"]'
  );

  for (const el of candidates) {
    if (el.closest("#bds-root")) continue;
    if (el.classList?.contains("ds-markdown") || el.classList?.contains("fbb737a4")) continue;
    if (el.children && el.children.length > 0) continue;

    const text = el.textContent || "";
    if (!/BetterDeepSeek|BDS:/i.test(text)) continue;

    const stored = el.getAttribute("data-bds-clean-text");
    if (stored === text) continue;

    const cleaned = cleanBdsString(text);

    safeSetAttribute(el, "data-bds-clean-text", cleaned);
    safeSetTextContent(el, cleaned);
  }
}
