// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import MessageOverlay from "../../../src/content/ui/MessageOverlay.svelte";
import appState from "../../../src/content/state.js";
import { renderSvelte, flushUi } from "../../helpers/svelte.js";

describe("MessageOverlay integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    appState.deepResearch.enabled = false;
    appState.deepResearch.pendingRun = null;
    appState.deepResearch.runs = [];
  });

  it("renders markdown text, ask-question info, and loading state", async () => {
    const questions = [
      { id: "q1", question: "Pick one", type: "test", options: ["A", "B"] }
    ];
    const { target, cleanup } = renderSvelte(MessageOverlay, {
      text: "# Heading\n\nParagraph",
      blocks: [{ name: "ask_question", content: JSON.stringify(questions), attrs: {} }],
      loading: true,
      loadingIndex: 2,
    });
    await flushUi();

    expect(target.querySelector("h1")?.textContent).toBe("Heading");
    expect(target.textContent).toContain("Clarifying questions asked.");
    expect(target.textContent).toContain("Pick one");
    expect(target.textContent).toContain("A");
    expect(target.textContent).toContain("B");
    expect(target.textContent).toContain("Working...");
    cleanup();
  });

  it("renders search request card with provider name and live-updates on search-status events", async () => {
    const results = [
      { title: "Result One", url: "https://one.com", snippet: "First snippet" },
    ];
    const { target, cleanup } = renderSvelte(MessageOverlay, {
      text: "",
      blocks: [
        { name: "auto:search", content: "deepseek api docs", attrs: {} },
        {
          name: "auto_search_result",
          content: JSON.stringify(results),
          attrs: { query: "deepseek api docs", count: "1", deepFetch: "0", provider: "Bing", lowConfidence: true },
        },
      ],
      loading: false,
      loadingIndex: -1,
    });
    await flushUi();

    expect(target.textContent).toContain("Searching DuckDuckGo Lite...");
    expect(target.textContent).toContain("Search Results: deepseek api docs");
    expect(target.textContent).toContain("1 results found");
    expect(target.textContent).toContain("via Bing");
    expect(target.textContent).toContain("Low-confidence results");

    window.dispatchEvent(new CustomEvent("bds:search-status", {
      detail: { query: "deepseek api docs", provider: "Bing", phase: "searching" },
    }));
    await flushUi();
    expect(target.textContent).toContain("Searching Bing...");
    cleanup();
  });

  it("shows answers when bds-questions-answered event fires", async () => {
    const questions = [
      { id: "q1", question: "Pick one", type: "test", options: ["A", "B"] }
    ];
    const { target, cleanup } = renderSvelte(MessageOverlay, {
      blocks: [{ name: "ask_question", content: JSON.stringify(questions), attrs: {} }],
    });
    await flushUi();

    window.dispatchEvent(new CustomEvent("bds-questions-answered", {
      detail: { questions, answers: { q1: "A" } }
    }));
    await flushUi();

    expect(target.textContent).toContain("→ A");
    cleanup();
  });

  it("collapses outer by default when multiple questions", async () => {
    const questions = [
      { id: "q1", question: "First", type: "test" },
      { id: "q2", question: "Second", type: "input" }
    ];
    const { target, cleanup } = renderSvelte(MessageOverlay, {
      blocks: [{ name: "ask_question", content: JSON.stringify(questions), attrs: {} }],
    });
    await flushUi();

    expect(target.textContent).toContain("Clarifying questions asked.");
    expect(target.textContent).toContain("(2)");
    expect(target.textContent).not.toContain("First");
    expect(target.textContent).not.toContain("Second");
    cleanup();
  });

  it("renders deep research plan blocks and dispatches approval", async () => {
    const plan = {
      title: "Gaming Laptop Research",
      steps: [{ id: 1, action: "search", query: "best gaming laptop", purpose: "overview" }],
    };
    const listener = vi.fn();
    window.addEventListener("bds:deep-research-approve", listener, { once: true });
    appState.deepResearch.enabled = true;
    appState.deepResearch.runs = [{
      id: "run123",
      conversationId: "conv1",
      status: "planning",
      plan,
      sourceLedger: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }];

    const { target, cleanup } = renderSvelte(MessageOverlay, {
      blocks: [{
        name: "deep_research_plan",
        attrs: { runId: "run123" },
        content: JSON.stringify(plan),
      }],
    });
    await flushUi();

    expect(target.textContent).toContain("Gaming Laptop Research");
    expect(target.textContent).toContain("best gaming laptop");
    target.querySelector('[data-testid="dr-approve-btn"]').click();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.runId).toBe("run123");
    expect(listener.mock.calls[0][0].detail.plan.title).toBe("Gaming Laptop Research");
    cleanup();
  });

  it("opens deep research revision feedback for request changes", async () => {
    const plan = {
      title: "Gaming Laptop Research",
      steps: [{ id: 1, action: "search", query: "best gaming laptop", purpose: "overview" }],
    };
    const listener = vi.fn();
    window.addEventListener("bds:deep-research-open-revision", listener, { once: true });
    appState.deepResearch.enabled = true;
    appState.deepResearch.runs = [{
      id: "run-revise",
      conversationId: "conv1",
      status: "planning",
      plan,
      sourceLedger: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }];

    const { target, cleanup } = renderSvelte(MessageOverlay, {
      blocks: [{
        name: "deep_research_plan",
        attrs: { runId: "run-revise" },
        content: JSON.stringify(plan),
      }],
    });
    await flushUi();

    target.querySelector('[data-testid="dr-revise-btn"]').click();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.runId).toBe("run-revise");
    expect(listener.mock.calls[0][0].detail.plan.title).toBe("Gaming Laptop Research");
    cleanup();
  });

  it("renders deep research plan JSON with trailing commas and quoted query terms", async () => {
    const content = `{
      "title": "Rooting Tecno POVA Pro 5G",
      "steps": [
        {
          "id": 1,
          "action": "search",
          "query": ""Tecno POVA Pro 5G" root magisk 2025 2026",
          "purpose": "Catch recent guides",
        },
      ],
    }`;
    appState.deepResearch.enabled = true;
    appState.deepResearch.runs = [{
      id: "run-json",
      conversationId: "conv1",
      status: "planning",
      plan: null,
      sourceLedger: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }];

    const { target, cleanup } = renderSvelte(MessageOverlay, {
      blocks: [{
        name: "deep_research_plan",
        attrs: { runId: "run-json" },
        content,
      }],
    });
    await flushUi();

    expect(target.textContent).toContain("Rooting Tecno POVA Pro 5G");
    expect(target.textContent).toContain("Tecno POVA Pro 5G");
    expect(target.textContent).not.toContain("Failed to parse");
    cleanup();
  });
});
