// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import { cleanBdsString, hideBdsTagsInPopovers, hideTagsInSidebar } from "./tag-hider.js";

describe("tag-hider cleanBdsString", () => {
  it("strips closed Deepsick tags (raw & encoded)", () => {
    expect(cleanBdsString("<Deepsick>system prompt</Deepsick>User question")).toBe("User question");
    expect(cleanBdsString("&lt;Deepsick&gt;system prompt&lt;/Deepsick&gt;User question")).toBe("User question");
  });

  it("strips unclosed Deepsick tags from truncated preview strings", () => {
    expect(cleanBdsString("<Deepsick> You are Deepsick. You have access to specialized tools.")).toBe("");
    expect(cleanBdsString("&lt;Deepsick&gt; You are Deepsick. You have access...")).toBe("");
    expect(cleanBdsString("3/3 <Deepsick> You are Deepsick. You...")).toBe("3/3");
    expect(cleanBdsString("3/3 &lt;Deepsick&gt; You are Deepsick. You...")).toBe("3/3");
  });

  it("strips closed & unclosed BDS: control tags", () => {
    expect(cleanBdsString("<BDS:VISUALIZER>data</BDS:VISUALIZER>Hello")).toBe("Hello");
    expect(cleanBdsString("&lt;BDS:VISUALIZER&gt;data&lt;/BDS:VISUALIZER&gt;Hello")).toBe("Hello");
    expect(cleanBdsString("<BDS:AUTO:REQUEST_WEB_FETCH>https://example.com")).toBe("");
  });
});

describe("tag-hider hideBdsTagsInPopovers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("cleans Deepsick tags from popover preview items (issue #93)", () => {
    document.body.innerHTML = `
      <div class="ds-virtual-list-visible-items">
        <div class="_81e7b5e">
          <div class="_72b6158">&lt;Deepsick&gt; mesajıdsadasda placeholder</div>
        </div>
        <div class="_81e7b5e">
          <div class="_72b6158">3/3 &lt;Deepsick&gt; You are Deepsick.</div>
        </div>
        <div class="_81e7b5e">
          <div class="_72b6158">&lt;Deepsick&gt;sys&lt;/Deepsick&gt;Actual question</div>
        </div>
      </div>
    `;

    hideBdsTagsInPopovers();

    const items = document.querySelectorAll("._72b6158");
    expect(items[0].textContent).toBe("");
    expect(items[1].textContent).toBe("3/3");
    expect(items[2].textContent).toBe("Actual question");
  });

  it("does not touch main message markdown bubbles or extension UI", () => {
    document.body.innerHTML = `
      <div id="bds-root">
        <div class="_72b6158">&lt;Deepsick&gt; internal</div>
      </div>
      <div class="ds-message">
        <div class="ds-markdown">&lt;Deepsick&gt; main message</div>
      </div>
    `;

    hideBdsTagsInPopovers();

    expect(document.querySelector("#bds-root ._72b6158").textContent).toBe("<Deepsick> internal");
    expect(document.querySelector(".ds-markdown").textContent).toBe("<Deepsick> main message");
  });
});

describe("tag-hider hideTagsInSidebar", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("strips tag suffix and stores full title", () => {
    document.body.innerHTML = `
      <a href="/chat/s/12345">
        <span class="c08e6e93">My Project &lt;coding&gt;</span>
      </a>
    `;

    hideTagsInSidebar();

    const titleEl = document.querySelector(".c08e6e93");
    expect(titleEl.textContent).toBe("My Project");
    expect(titleEl.getAttribute("data-bds-full-title")).toBe("My Project <coding>");
  });

  it("is idempotent on repeated scans", () => {
    document.body.innerHTML = `
      <a href="/chat/s/12345">
        <span class="c08e6e93">My Project &lt;coding&gt;</span>
      </a>
    `;

    hideTagsInSidebar();
    hideTagsInSidebar();

    const titleEl = document.querySelector(".c08e6e93");
    expect(titleEl.textContent).toBe("My Project");
    expect(titleEl.getAttribute("data-bds-full-title")).toBe("My Project <coding>");
  });

  it("preserves legitimate chat renames without stomping", () => {
    document.body.innerHTML = `
      <a href="/chat/s/12345">
        <span class="c08e6e93">Old Topic &lt;coding&gt;</span>
      </a>
    `;

    hideTagsInSidebar();
    const titleEl = document.querySelector(".c08e6e93");
    expect(titleEl.textContent).toBe("Old Topic");

    // User or DeepSeek renames chat to "Renamed Topic"
    titleEl.textContent = "Renamed Topic";

    hideTagsInSidebar();
    expect(titleEl.textContent).toBe("Renamed Topic");
    expect(titleEl.hasAttribute("data-bds-full-title")).toBe(false);
  });

  it("updates correctly when renamed to a new tagged title", () => {
    document.body.innerHTML = `
      <a href="/chat/s/12345">
        <span class="c08e6e93">Old Topic &lt;coding&gt;</span>
      </a>
    `;

    hideTagsInSidebar();
    const titleEl = document.querySelector(".c08e6e93");

    // Renamed to a new tagged title
    titleEl.textContent = "Brand New <design>";

    hideTagsInSidebar();
    expect(titleEl.textContent).toBe("Brand New");
    expect(titleEl.getAttribute("data-bds-full-title")).toBe("Brand New <design>");
  });
});
