// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  safeAppendChild,
  safeInsertBefore,
  safeRemove,
  safeSetTextContent,
  safeAddClass,
  safeRemoveClass,
  safeSetAttribute,
  safeRemoveAttribute,
} from "../../src/content/dom/dom-safety.js";

describe("dom-safety helpers", () => {
  let parent;
  let child;

  beforeEach(() => {
    document.body.innerHTML = "";
    parent = document.createElement("div");
    child = document.createElement("span");
    document.body.appendChild(parent);
  });

  describe("safeAppendChild", () => {
    it("appends child to parent safely", () => {
      const res = safeAppendChild(parent, child);
      expect(res).toBe(child);
      expect(parent.contains(child)).toBe(true);
    });

    it("returns null if parent or child is falsy", () => {
      expect(safeAppendChild(null, child)).toBeNull();
      expect(safeAppendChild(parent, null)).toBeNull();
    });
  });

  describe("safeInsertBefore", () => {
    it("inserts newNode before reference node", () => {
      const existing = document.createElement("p");
      parent.appendChild(existing);

      const res = safeInsertBefore(parent, child, existing);
      expect(res).toBe(child);
      expect(parent.firstChild).toBe(child);
    });

    it("handles null reference node like appendChild", () => {
      const res = safeInsertBefore(parent, child, null);
      expect(res).toBe(child);
      expect(parent.lastChild).toBe(child);
    });

    it("returns null if parent or newNode is falsy", () => {
      expect(safeInsertBefore(null, child, null)).toBeNull();
      expect(safeInsertBefore(parent, null, null)).toBeNull();
    });
  });

  describe("safeRemove", () => {
    it("removes child from parent safely", () => {
      parent.appendChild(child);
      expect(parent.contains(child)).toBe(true);

      const res = safeRemove(child);
      expect(res).toBe(true);
      expect(parent.contains(child)).toBe(false);
    });

    it("returns false if node is null or detached", () => {
      expect(safeRemove(null)).toBe(false);
      expect(safeRemove(child)).toBe(false);
    });
  });

  describe("safeSetTextContent", () => {
    it("sets textContent on element safely", () => {
      safeSetTextContent(child, "Hello BDS");
      expect(child.textContent).toBe("Hello BDS");
    });

    it("handles null or undefined gracefully", () => {
      safeSetTextContent(child, null);
      expect(child.textContent).toBe("");
    });

    it("returns false if node is null", () => {
      expect(safeSetTextContent(null, "text")).toBe(false);
    });
  });

  describe("safeAddClass and safeRemoveClass", () => {
    it("adds and removes classes safely", () => {
      safeAddClass(child, "class-a", "class-b");
      expect(child.classList.contains("class-a")).toBe(true);
      expect(child.classList.contains("class-b")).toBe(true);

      safeRemoveClass(child, "class-a");
      expect(child.classList.contains("class-a")).toBe(false);
      expect(child.classList.contains("class-b")).toBe(true);
    });

    it("does not throw on null node", () => {
      expect(() => safeAddClass(null, "foo")).not.toThrow();
      expect(() => safeRemoveClass(null, "foo")).not.toThrow();
    });
  });

  describe("safeSetAttribute and safeRemoveAttribute", () => {
    it("sets and removes attributes safely", () => {
      safeSetAttribute(child, "data-test", "val123");
      expect(child.getAttribute("data-test")).toBe("val123");

      safeRemoveAttribute(child, "data-test");
      expect(child.hasAttribute("data-test")).toBe(false);
    });

    it("does not throw on null node", () => {
      expect(() => safeSetAttribute(null, "a", "b")).not.toThrow();
      expect(() => safeRemoveAttribute(null, "a")).not.toThrow();
    });
  });

  describe("withObserverPaused", () => {
    it("disconnects and re-observes with CHAT_OBSERVER_OPTIONS including characterData", async () => {
      const { withObserverPaused, default: state } = await import("../../src/content/state.js");
      let observedOptions = null;
      let disconnected = false;

      state.observer = {
        disconnect: () => {
          disconnected = true;
        },
        observe: (_target, options) => {
          observedOptions = options;
        },
      };

      const result = withObserverPaused(() => {
        expect(disconnected).toBe(true);
        return 42;
      });

      expect(result).toBe(42);
      expect(observedOptions).toEqual({
        subtree: true,
        childList: true,
        characterData: true,
      });
      state.observer = null;
    });
  });
});
