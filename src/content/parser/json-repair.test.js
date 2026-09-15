import { describe, expect, it } from "vitest";
import { parseLooseJson } from "./json-repair.js";

describe("parseLooseJson - backslash escape repair", () => {
  it("parses clean JSON as-is", () => {
    const result = parseLooseJson('{"key": "value"}');
    expect(result.value).toEqual({ key: "value" });
    expect(result.error).toBe("");
  });

  it("repairs unescaped backslash before b (\\b → literal backslash)", () => {
    const result = parseLooseJson('[{"id":"q","question":"F:\\better?"}]');
    expect(result.value[0].question).toBe("F:\\better?");
  });

  it("repairs unescaped backslash before f (\\f → literal backslash)", () => {
    const result = parseLooseJson('{"path": "test\\folder"}');
    expect(result.value.path).toBe("test\\folder");
  });

  it("repairs invalid JSON escape sequences (\\p, \\o, etc.)", () => {
    const result = parseLooseJson('{"path": "C:\\program files\\other"}');
    expect(result.value.path).toBe("C:\\program files\\other");
  });

  it("preserves intentional \\n escape as newline", () => {
    const result = parseLooseJson('{"text": "line1\\nline2"}');
    expect(result.value.text).toBe("line1\nline2");
  });

  it("treats \\t as literal backslash (safe heuristic for path-like content)", () => {
    const result = parseLooseJson('{"text": "col1\\tcol2"}');
    expect(result.value.text).toBe("col1\\tcol2");
  });

  it("preserves intentional \\\" escape as quote", () => {
    const result = parseLooseJson('{"text": "he said \\"hello\\""}');
    expect(result.value.text).toBe('he said "hello"');
  });

  it("preserves intentional \\\\ escape as backslash", () => {
    const result = parseLooseJson('{"path": "C:\\\\path"}');
    expect(result.value.path).toBe("C:\\path");
  });

  it("repairs trailing comma common in AI output", () => {
    const result = parseLooseJson('[{"id":"q","question":"test",}]');
    expect(result.value[0].question).toBe("test");
  });

  it("repairs unescaped quotes inside strings", () => {
    const result = parseLooseJson('{"text": "say "hello" world"}');
    expect(result.value.text).toBe('say "hello" world');
  });

  it("handles valid unicode escape \\uXXXX correctly", () => {
    const result = parseLooseJson('{"char": "\\u0041"}');
    expect(result.value.char).toBe("A");
  });

  it('repairs broken \\u (no hex digits) as literal', () => {
    const result = parseLooseJson('{"text": "\\u"}');
    expect(result.value.text).toBe("\\u");
  });

  it("handles complex real-world ask_question with Windows paths", () => {
    const input = '[{"id":"path_check","question":"Is path correct: F:\\better-deepseek?","type":"input"}]';
    const result = parseLooseJson(input);
    expect(result.value[0].question).toBe("Is path correct: F:\\better-deepseek?");
  });

  it("handles multiple backslash issues in one JSON", () => {
    const input = '{"paths": ["C:\\users\\test", "D:\\data\\file"]}';
    const result = parseLooseJson(input);
    expect(result.value.paths[0]).toBe("C:\\users\\test");
    expect(result.value.paths[1]).toBe("D:\\data\\file");
  });

  it("returns null for truly invalid JSON even after repair attempts", () => {
    const result = parseLooseJson("not json at all {{{");
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
