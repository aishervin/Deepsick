import { unwrapMarkdownCodeFence } from "./tag-parser.js";

function stripTrailingCommas(text) {
  return String(text || "").replace(/,\s*([}\]])/g, "$1");
}

function nextNonWhitespace(text, startIndex) {
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (!/\s/.test(char)) return char;
  }
  return "";
}

/**
 * JSON escape sequences that AI models intentionally produce.
 * These should always be preserved as-is.
 * Only \" and \\ are truly unambiguous in AI-generated JSON.
 * \/ is harmless but rare. \n is preserved because it is the
 * standard JSON way to represent newlines.
 */
const INTENTIONAL_ESCAPES = new Set(['"', '\\', '/', 'n']);

/**
 * Escape sequences that are technically valid JSON but almost never
 * intentionally produced by AI models in BDS tag content.
 * \t is moved here because it appears frequently in Windows paths
 * (e.g. "C:\users\test") as a literal backslash + t.
 * \b (backspace) and \f (form feed) are almost never intentional.
 * \r is rarely intentional in AI-generated text.
 */
const RARELY_INTENTIONAL = new Set(['b', 'f', 't', 'r']);

function isHexDigit(ch) {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}

function escapeInvalidStringQuotes(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (inString && char === "\\") {
      const next = text[i + 1];

      if (next && INTENTIONAL_ESCAPES.has(next)) {
        output += char;
        escaped = true;
        continue;
      }

      if (next && RARELY_INTENTIONAL.has(next)) {
        output += "\\\\" + next;
        i++;
        continue;
      }

      if (next === 'u') {
        const h1 = text[i + 2];
        const h2 = text[i + 3];
        const h3 = text[i + 4];
        const h4 = text[i + 5];
        if (isHexDigit(h1) && isHexDigit(h2) && isHexDigit(h3) && isHexDigit(h4)) {
          output += char;
          escaped = true;
          continue;
        }
        output += "\\\\u";
        i++;
        continue;
      }

      if (next) {
        output += "\\\\" + next;
        i++;
        continue;
      }

      output += "\\\\";
      continue;
    }

    if (char === '"') {
      if (!inString) {
        inString = true;
        output += char;
        continue;
      }

      const next = nextNonWhitespace(text, i + 1);
      if (!next || next === ":" || next === "," || next === "}" || next === "]") {
        inString = false;
        output += char;
      } else {
        output += '\\"';
      }
      continue;
    }

    output += char;
  }

  return output;
}

function normalizeJsonLikeText(content) {
  return unwrapMarkdownCodeFence(String(content || ""))
    .replace(/^\uFEFF/, "")
    .trim();
}

function buildCandidates(content) {
  const normalized = normalizeJsonLikeText(content);
  const withoutTrailingCommas = stripTrailingCommas(normalized);
  const withEscapedQuotes = escapeInvalidStringQuotes(withoutTrailingCommas);

  // Order matters: the escaped variant comes first because it fixes
  // semantic issues like \b → \\b that JSON.parse accepts silently.
  return Array.from(new Set([
    withEscapedQuotes,
    stripTrailingCommas(withEscapedQuotes),
    normalized,
    withoutTrailingCommas,
  ]));
}

export function parseLooseJson(content) {
  let lastError = null;

  for (const candidate of buildCandidates(content)) {
    try {
      return {
        value: JSON.parse(candidate),
        error: "",
        text: candidate,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    value: null,
    error: lastError?.message || "Invalid JSON",
    text: normalizeJsonLikeText(content),
  };
}
